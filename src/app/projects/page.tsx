import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import { asc, sql } from "drizzle-orm";
import { calculateTimeline } from "@/lib/timeline";
import ProjectsView from "./ProjectsView";

// DBアクセスが必要なため動的レンダリング（ビルド時の静的生成を防止）
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ProjectsPage() {
  // 1ページ目のみサーバーで取得（以降はクライアント側でAPI経由）
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(projects);
  const totalCount = Number(countResult.count);

  const pageProjects = await db
    .select()
    .from(projects)
    .orderBy(asc(projects.managementNumber))
    .limit(PAGE_SIZE);

  // 超過判定: 対象案件のみ取得（全件スキャンを回避）
  const projectIds = pageProjects.map((p) => p.id);
  const progressByProject = new Map<number, typeof progress.$inferSelect[]>();

  if (projectIds.length > 0) {
    // IN句で対象案件のProgressのみ取得
    const relevantProgress = await db
      .select()
      .from(progress)
      .where(sql`${progress.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`);

    for (const p of relevantProgress) {
      const arr = progressByProject.get(p.projectId) || [];
      arr.push(p);
      progressByProject.set(p.projectId, arr);
    }
  }

  const now = new Date();
  const projectsWithOverdue = pageProjects.map((project) => {
    const projectProgress = progressByProject.get(project.id) || [];
    let hasOverdue = false;

    if (projectProgress.length > 0) {
      hasOverdue = projectProgress.some((p) => {
        if (p.status === "completed") return false;
        const dueDate = new Date(p.createdAt);
        return dueDate.getTime() < now.getTime();
      });
    } else if (project.completionMonth) {
      const timeline = calculateTimeline(project.completionMonth, false);
      hasOverdue = timeline.some((phase) => phase.date.getTime() < now.getTime());
    }

    return { ...project, hasOverdue };
  });

  return (
    <ProjectsView
      initialProjects={projectsWithOverdue}
      initialPagination={{
        page: 1,
        limit: PAGE_SIZE,
        totalCount,
        totalPages: Math.ceil(totalCount / PAGE_SIZE),
      }}
    />
  );
}
