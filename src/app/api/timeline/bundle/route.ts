import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth-guard";

/**
 * GET /api/timeline/bundle
 *
 * タイムライン画面用のバンドルAPI
 * プロジェクト一覧と進捗データを1回のリクエストで取得
 *
 * レスポンス:
 * - projects: プロジェクト + progressItems の配列
 */
export async function GET() {
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  try {
    // JOINクエリで一括取得
    const rows = await db
      .select({
        project: projects,
        progressItem: progress,
      })
      .from(projects)
      .leftJoin(progress, eq(progress.projectId, projects.id))
      .where(eq(projects.organizationId, organizationId));

    // プロジェクトごとにグループ化
    const projectMap = new Map<
      number,
      (typeof projects.$inferSelect) & { progressItems: (typeof progress.$inferSelect)[] }
    >();

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

    return NextResponse.json({
      projects: projectsWithProgress,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Timeline bundle fetch failed:", error);
    return NextResponse.json(
      { error: "データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
