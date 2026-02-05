import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress, comments, todos } from "@/db/schema";
import { calculateTimeline } from "@/lib/timeline";
import { createProjectSchema, validateBody } from "@/lib/validations";
import { createErrorResponse } from "@/lib/api-error";

// 一覧は常に最新を返すためキャッシュしない
export const dynamic = "force-dynamic";

// 全件取得（超過情報・コメント・TODO検索用テキスト付き）
export async function GET() {
  const allProjects = await db.select().from(projects);
  const allProgress = await db.select().from(progress);
  const allComments = await db.select().from(comments);
  const allTodos = await db.select().from(todos);

  const now = new Date();

  // 各案件に超過情報・コメント・TODO検索用テキストを追加
  const projectsWithOverdue = allProjects.map((project) => {
    const projectProgress = allProgress.filter((p) => p.projectId === project.id);
    const projectComments = allComments.filter((c) => c.projectId === project.id);
    const projectTodos = allTodos.filter((t) => t.projectId === project.id);
    const commentSearchText = projectComments.map((c) => c.content).join(" ");
    const todoSearchText = projectTodos.map((t) => t.content).join(" ");

    let hasOverdue = false;

    if (projectProgress.length > 0) {
      // 進捗データがある場合: 未完了かつ予定日が過去の進捗があるかチェック
      hasOverdue = projectProgress.some((p) => {
        if (p.status === "completed") return false;
        const dueDate = new Date(p.createdAt);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue < 0;
      });
    } else if (project.completionMonth) {
      // 進捗データがない場合: calculateTimelineで計算して超過判定
      const timeline = calculateTimeline(project.completionMonth, false);
      hasOverdue = timeline.some((phase) => {
        const daysUntilDue = Math.ceil((phase.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue < 0;
      });
    }

    return {
      ...project,
      hasOverdue,
      commentSearchText,
      todoSearchText,
    };
  });

  return NextResponse.json(projectsWithOverdue);
}

// 新規追加
export async function POST(request: Request) {
  const validation = await validateBody(request, createProjectSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  try {
    const [result] = await db.insert(projects).values(validation.data).returning();
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, "プロジェクトの作成に失敗しました");
  }
}
