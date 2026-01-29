import { db } from "@/db";
import { projects, progress, comments } from "@/db/schema";
import { calculateTimeline } from "@/lib/timeline";
import ProjectsView from "./ProjectsView";

// 他画面から戻ったときに常に最新一覧を表示するためキャッシュしない
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const allProjects = await db.select().from(projects);
  const allProgress = await db.select().from(progress);
  const allComments = await db.select().from(comments);

  const now = new Date();

  // 各案件に超過情報とコメント検索用テキストを追加
  const projectsWithOverdue = allProjects.map((project) => {
    const projectProgress = allProgress.filter((p) => p.projectId === project.id);
    const projectComments = allComments.filter((c) => c.projectId === project.id);
    const commentSearchText = projectComments.map((c) => c.content).join(" ");

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
    };
  });

  return <ProjectsView initialProjects={projectsWithOverdue} />;
}
