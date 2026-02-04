import { NextResponse } from "next/server";
import { db } from "@/db";
import { todos, projects, progress, meetings } from "@/db/schema";
import { eq } from "drizzle-orm";

// カレンダー用のイベントを一括取得
export async function GET() {
  try {
    // 並列でデータを取得
    const [allTodos, allProjects, allProgress, allMeetings] = await Promise.all([
      db.select().from(todos),
      db.select().from(projects),
      db.select().from(progress),
      db.select().from(meetings),
    ]);

    // プロジェクトIDをキーにしたマップを作成
    const projectMap = new Map(allProjects.map((p) => [p.id, p]));

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
      });
    }

    // 進捗イベント
    for (const prog of allProgress) {
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
      });
    }

    // 会議イベント
    for (const meeting of allMeetings) {
      events.push({
        id: `meeting-${meeting.id}`,
        type: "meeting" as const,
        title: meeting.title,
        start: meeting.meetingDate,
        projectId: null,
        projectName: null,
        status: null,
        description: meeting.content,
      });
    }

    return NextResponse.json(events);
  } catch (error) {
    console.error("カレンダーイベントの取得に失敗:", error);
    return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
  }
}
