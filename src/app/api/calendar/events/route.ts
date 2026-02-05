import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos, projects, progress, meetings, calendarEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createCalendarEventSchema, validateBody } from "@/lib/validations";
import { requireOrganization, getUserId } from "@/lib/auth-guard";

// カレンダー用のイベントを一括取得
export async function GET() {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  try {
    // 並列でデータを取得（組織でフィルタリング）
    const [allTodos, allProjects, allProgress, allMeetings, allCalendarEvents] = await Promise.all([
      db.select().from(todos).where(eq(todos.organizationId, organizationId)),
      db.select().from(projects).where(eq(projects.organizationId, organizationId)),
      db.select().from(progress),
      db.select().from(meetings).where(eq(meetings.organizationId, organizationId)),
      db.select().from(calendarEvents).where(eq(calendarEvents.organizationId, organizationId)),
    ]);

    // プロジェクトIDをキーにしたマップを作成
    const projectMap = new Map(allProjects.map((p) => [p.id, p]));
    const projectIds = new Set(allProjects.map((p) => p.id));

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

    // 進捗イベント（組織に属するプロジェクトのもののみ）
    for (const prog of allProgress) {
      if (!projectIds.has(prog.projectId)) continue;

      const date = prog.completedAt || prog.createdAt;
      if (!date) continue;

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
