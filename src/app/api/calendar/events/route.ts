import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos, projects, progress, meetings, calendarEvents } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { createCalendarEventSchema, validateBody } from "@/lib/validations";
import { requireOrganization, getUserId } from "@/lib/auth-guard";

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
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 4, 0);

  const startDate = startParam || defaultStart.toISOString().split("T")[0];
  const endDate = endParam || defaultEnd.toISOString().split("T")[0];

  try {
    // 組織のプロジェクトIDを先に取得
    const orgProjects = await db
      .select({ id: projects.id, managementNumber: projects.managementNumber })
      .from(projects)
      .where(eq(projects.organizationId, organizationId));

    const projectMap = new Map(orgProjects.map((p) => [p.id, p]));
    const projectIds = orgProjects.map((p) => p.id);

    // 並列でデータを取得（日付範囲 + 組織フィルタ）
    const [allTodos, allProgress, allMeetings, allCalendarEvents] = await Promise.all([
      // TODO: 期日でフィルタ
      db.select().from(todos).where(
        and(
          eq(todos.organizationId, organizationId),
          gte(todos.dueDate, startDate),
          lte(todos.dueDate, endDate)
        )
      ),
      // 進捗: プロジェクトIDでフィルタ（組織間接フィルタ）
      projectIds.length > 0
        ? db.select().from(progress).where(inArray(progress.projectId, projectIds))
        : Promise.resolve([]),
      // 会議: 日付でフィルタ
      db.select().from(meetings).where(
        and(
          eq(meetings.organizationId, organizationId),
          gte(meetings.meetingDate, startDate),
          lte(meetings.meetingDate, endDate)
        )
      ),
      // カスタムイベント: 日付でフィルタ
      db.select().from(calendarEvents).where(
        and(
          eq(calendarEvents.organizationId, organizationId),
          gte(calendarEvents.eventDate, startDate),
          lte(calendarEvents.eventDate, endDate)
        )
      ),
    ]);

    // イベントを構築
    const events = [];

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

    // 進捗イベント（既にプロジェクトIDでフィルタ済み）
    for (const prog of allProgress) {
      const date = prog.completedAt || prog.createdAt;
      if (!date) continue;

      // 日付範囲チェック
      const dateOnly = date.split("T")[0];
      if (dateOnly < startDate || dateOnly > endDate) continue;

      const project = projectMap.get(prog.projectId);
      events.push({
        id: `progress-${prog.id}`,
        type: "progress" as const,
        title: `${project?.managementNumber || ""}: ${prog.title}`,
        start: date.split("T")[0],
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
        projectId: null,
        projectName: null,
        status: null,
        description: event.description,
        userName: event.userName || null,
      });
    }

    return NextResponse.json(events);
  } catch (error) {
    console.error("カレンダーイベントの取得に失敗:", error);
    return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
  }
}

// カスタムイベントを作成
export async function POST(request: Request) {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  const validation = await validateBody(request, createCalendarEventSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { title, eventType, eventDate, endDate, description } = validation.data;

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
      description: result.description,
      userName: result.userName,
    }, { status: 201 });
  } catch (error) {
    console.error("イベントの作成に失敗:", error);
    return NextResponse.json({ error: "イベントの作成に失敗しました" }, { status: 500 });
  }
}
