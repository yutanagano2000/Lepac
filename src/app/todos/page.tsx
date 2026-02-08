import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import TimelineView from "./TimelineView";
import type { ProjectWithProgress } from "./_types";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  // 認証 + 組織フィルタ
  const authResult = await requireOrganization();
  if (!authResult.success) {
    redirect("/login");
  }
  const { organizationId } = authResult;

  // JOINクエリで一括取得（2クエリ → 1クエリ）
  const rows = await db
    .select({
      project: projects,
      progressItem: progress,
    })
    .from(projects)
    .leftJoin(progress, eq(progress.projectId, projects.id))
    .where(eq(projects.organizationId, organizationId));

  // プロジェクトごとにグループ化（サーバーサイドで処理）
  const projectMap = new Map<number, ProjectWithProgress>();

  for (const row of rows) {
    const projectId = row.project.id;

    if (!projectMap.has(projectId)) {
      projectMap.set(projectId, {
        ...row.project,
        progressItems: [],
      });
    }

    if (row.progressItem) {
      projectMap.get(projectId)!.progressItems.push(row.progressItem);
    }
  }

  const projectsWithProgress = Array.from(projectMap.values());

  return <TimelineView projects={projectsWithProgress} />;
}
