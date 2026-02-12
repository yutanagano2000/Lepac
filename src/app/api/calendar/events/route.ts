import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { todos, projects, progress, meetings, calendarEvents } from "@/db/schema";
import { eq, and, gte, lt, or, isNull, isNotNull, inArray, asc } from "drizzle-orm";
import { createCalendarEventSchema, validateBody } from "@/lib/validations";
import { requireOrganization, requireOrganizationWithCsrf, getUserId } from "@/lib/auth-guard";

// 各種別の最大件数（DoS防止）
const MAX_EVENTS_PER_TYPE = 500;

/**
 * 日付/日時値から YYYY-MM-DD 形式の文字列を安全に抽出
 * UTC統一: ISO文字列はT前を抽出、DateオブジェクトはUTC日付を使用
 */
function extractDateOnly(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    // ISO形式: YYYY-MM-DDTHH:mm:ss または YYYY-MM-DD
    return value.split("T")[0];
  }
  if (value instanceof Date) {
    // DateオブジェクトはUTC日付を使用（タイムゾーン不整合を防止）
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return null;
}

/**
 * 翌日の日付を計算（終日イベントの境界比較用）
 */
function getNextDay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const y = nextDate.getUTCFullYear();
  const m = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(nextDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// カレンダー用のイベントを一括取得（日付範囲フィルタ対応）
export async function GET(request: Request) {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  // 日付範囲パラメータを取得（デフォルト: 前後3ヶ月）
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  const now = new Date();
  // ローカル日付コンポーネントを使用（UTC変換によるオフバイワン防止）
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 4, 0);

  // 日付バリデーション（YYYY-MM-DD形式、厳格なカレンダー日付チェック）
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const isValidDate = (dateStr: string): boolean => {
    if (!dateRegex.test(dateStr)) return false;
    // 厳格な日付検証: 2025-02-30のような不正日付を拒否
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    // ラウンドトリップ検証: 正規化後の値が元と一致するか確認
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  };

  // ユーザー入力のバリデーション
  if (startParam && !isValidDate(startParam)) {
    return NextResponse.json({ error: "無効な開始日付形式です" }, { status: 400 });
  }
  if (endParam && !isValidDate(endParam)) {
    return NextResponse.json({ error: "無効な終了日付形式です" }, { status: 400 });
  }

  const startDate = startParam || formatLocalDate(defaultStart);
  const endDate = endParam || formatLocalDate(defaultEnd);
  // 終了日の翌日（< nextDay で境界比較）
  const endDateNextDay = getNextDay(endDate);

  // 開始日が終了日より後の場合はエラー
  if (startDate > endDate) {
    return NextResponse.json({ error: "開始日は終了日より前である必要があります" }, { status: 400 });
  }

  // 日付範囲の制限（最大365日）- リソース枯渇攻撃防止
  const MAX_RANGE_DAYS = 365;
  const startMs = new Date(startDate + "T00:00:00Z").getTime();
  const endMs = new Date(endDate + "T00:00:00Z").getTime();
  const rangeDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
  if (rangeDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `日付範囲は${MAX_RANGE_DAYS}日以内にしてください` },
      { status: 400 }
    );
  }

  try {
    // 組織のプロジェクトIDを先に取得
    const orgProjects = await db
      .select({ id: projects.id, managementNumber: projects.managementNumber })
      .from(projects)
      .where(eq(projects.organizationId, organizationId));

    const projectMap = new Map(orgProjects.map((p) => [p.id, p]));
    const projectIds = orgProjects.map((p) => p.id);

    // 並列でデータを取得（日付範囲 + 組織フィルタ + 件数制限）
    // 境界比較: >= startDate AND < endDateNextDay（終了日当日のレコードを含む）
    const [allTodos, allProgress, allMeetings, allCalendarEvents] = await Promise.all([
      // TODO: 期日でフィルタ
      db.select().from(todos).where(
        and(
          eq(todos.organizationId, organizationId),
          gte(todos.dueDate, startDate),
          lt(todos.dueDate, endDateNextDay)
        )
      ).orderBy(asc(todos.dueDate), asc(todos.id)).limit(MAX_EVENTS_PER_TYPE),
      // 進捗: プロジェクトID + 日付範囲でフィルタ（SQLレベルで絞り込み）
      projectIds.length > 0
        ? db.select().from(progress).where(
            and(
              inArray(progress.projectId, projectIds),
              or(
                // 完了日がある場合: 完了日で範囲フィルタ
                and(
                  isNotNull(progress.completedAt),
                  gte(progress.completedAt, startDate),
                  lt(progress.completedAt, endDateNextDay)
                ),
                // 完了日がない場合: 作成日で範囲フィルタ
                and(
                  isNull(progress.completedAt),
                  gte(progress.createdAt, startDate),
                  lt(progress.createdAt, endDateNextDay)
                )
              )
            )
          ).orderBy(asc(progress.createdAt), asc(progress.id)).limit(MAX_EVENTS_PER_TYPE)
        : Promise.resolve([]),
      // 会議: 日付でフィルタ
      db.select().from(meetings).where(
        and(
          eq(meetings.organizationId, organizationId),
          gte(meetings.meetingDate, startDate),
          lt(meetings.meetingDate, endDateNextDay)
        )
      ).orderBy(asc(meetings.meetingDate), asc(meetings.id)).limit(MAX_EVENTS_PER_TYPE),
      // カスタムイベント: 日付でフィルタ
      db.select().from(calendarEvents).where(
        and(
          eq(calendarEvents.organizationId, organizationId),
          gte(calendarEvents.eventDate, startDate),
          lt(calendarEvents.eventDate, endDateNextDay)
        )
      ).orderBy(asc(calendarEvents.eventDate), asc(calendarEvents.id)).limit(MAX_EVENTS_PER_TYPE),
    ]);

    // カレンダーイベント型定義
    type CalendarEvent = {
      id: string;
      type: "todo" | "progress" | "meeting" | "other";
      title: string;
      start: string | null;
      end?: string | null;
      projectId: number | null;
      projectName: string | null;
      status: string | null;
      description: string | null;
      userName: string | null;
      category?: string | null;
    };

    // イベントを構築
    const events: CalendarEvent[] = [];

    // TODOイベント
    for (const todo of allTodos) {
      const project = todo.projectId ? projectMap.get(todo.projectId) : null;
      events.push({
        id: `todo-${todo.id}`,
        type: "todo" as const,
        title: todo.content,
        start: todo.dueDate,
        projectId: todo.projectId,
        projectName: project?.managementNumber || null,
        status: todo.completedAt ? "completed" : "pending",
        description: null,
        userName: todo.userName || null,
      });
    }

    // 進捗イベント（SQLレベルで日付フィルタ済み）
    for (const prog of allProgress) {
      const dateValue = prog.completedAt || prog.createdAt;
      const dateOnly = extractDateOnly(dateValue);
      if (!dateOnly) continue;

      const project = projectMap.get(prog.projectId);
      events.push({
        id: `progress-${prog.id}`,
        type: "progress" as const,
        title: `${project?.managementNumber || ""}: ${prog.title}`,
        start: dateOnly,
        projectId: prog.projectId,
        projectName: project?.managementNumber || null,
        status: prog.status,
        description: prog.description,
        userName: null,
      });
    }

    // 会議イベント（タイトルのみ、議事録は含めない）
    for (const meeting of allMeetings) {
      events.push({
        id: `meeting-${meeting.id}`,
        type: "meeting" as const,
        title: meeting.title,
        start: meeting.meetingDate,
        projectId: null,
        projectName: null,
        status: null,
        description: null, // 議事録は含めない
        userName: null,
        category: meeting.category, // 種別（社内/社外）
      });
    }

    // カスタムイベント
    for (const event of allCalendarEvents) {
      events.push({
        id: `custom-${event.id}`,
        type: event.eventType as "todo" | "meeting" | "other",
        title: event.title,
        start: event.eventDate,
        end: event.endDate,
        startTime: event.startTime || null,
        endTime: event.endTime || null,
        projectId: null,
        projectName: null,
        status: null,
        description: event.description,
        userName: event.userName || null,
      });
    }

    return NextResponse.json(events);
  } catch (error) {
    // エラーログは内部詳細を記録（クライアントには一般的なメッセージのみ）
    console.error("カレンダーイベントの取得に失敗");
    return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
  }
}

// カスタムイベントを作成
export async function POST(request: NextRequest) {
  // 認証・組織チェック
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  const validation = await validateBody(request, createCalendarEventSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { title, eventType, eventDate, endDate, startTime, endTime, description } = validation.data;

  // endDateがeventDateより前の場合はエラー
  if (endDate && endDate < eventDate) {
    return NextResponse.json(
      { error: "終了日は開始日以降の日付を指定してください" },
      { status: 400 }
    );
  }

  // セッションからユーザー情報を取得
  const userId = getUserId(user);
  const userName = user.name || user.username || null;

  try {
    const [result] = await db
      .insert(calendarEvents)
      .values({
        organizationId, // 組織IDを自動設定
        title,
        eventType: eventType || "other",
        eventDate,
        endDate: endDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
        description: description || null,
        userId,
        userName,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({
      id: `custom-${result.id}`,
      type: result.eventType,
      title: result.title,
      start: result.eventDate,
      end: result.endDate,
      startTime: result.startTime,
      endTime: result.endTime,
      description: result.description,
      userName: result.userName,
    }, { status: 201 });
  } catch (error) {
    // エラーログは内部詳細を記録（クライアントには一般的なメッセージのみ）
    console.error("イベントの作成に失敗");
    return NextResponse.json({ error: "イベントの作成に失敗しました" }, { status: 500 });
  }
}
