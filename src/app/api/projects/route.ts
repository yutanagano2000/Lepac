import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import { eq, asc, sql, like, or, and } from "drizzle-orm";
import { calculateTimeline } from "@/lib/timeline";
import { createProjectSchema, validateBody } from "@/lib/validations";
import { createErrorResponse } from "@/lib/api-error";
import { requireOrganization, requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { logProjectCreate } from "@/lib/audit-log";

/**
 * GET /api/projects
 *
 * クエリパラメータ:
 *   page     — ページ番号（1始まり、デフォルト 1）
 *   limit    — 1ページの件数（デフォルト 50）
 *   q        — テキスト検索（管理番号・案件番号・地権者・住所）
 *   sort     — "asc" | "desc"（管理番号ソート、デフォルト asc）
 */
export async function GET(request: NextRequest) {
  const authResult = await requireOrganization();
  if (!authResult.success) return authResult.response;
  const { organizationId } = authResult;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
  const searchQuery = url.searchParams.get("q")?.trim() || "";
  const sortDir = url.searchParams.get("sort") === "desc" ? "desc" : "asc";
  const offset = (page - 1) * limit;

  // WHERE条件を構築
  const orgFilter = eq(projects.organizationId, organizationId);
  let whereClause;

  if (searchQuery) {
    const pattern = `%${searchQuery}%`;
    whereClause = and(
      orgFilter,
      or(
        like(projects.managementNumber, pattern),
        like(projects.projectNumber, pattern),
        like(projects.address, pattern),
        like(projects.landowner1, pattern),
        like(projects.landowner2, pattern),
        like(projects.landowner3, pattern),
        like(projects.landowner, pattern),
        like(projects.landownerAddress, pattern),
      )
    );
  } else {
    whereClause = orgFilter;
  }

  // 総件数を取得
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(whereClause);
  const totalCount = Number(countResult.count);

  // ページネーション付きで案件取得
  const orderBy = sortDir === "desc"
    ? sql`${projects.managementNumber} DESC`
    : asc(projects.managementNumber);

  const pageProjects = await db
    .select()
    .from(projects)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  // 超過判定: Map を使った O(n) ルックアップ
  const projectIds = pageProjects.map((p) => p.id);
  let progressByProject = new Map<number, typeof progress.$inferSelect[]>();

  if (projectIds.length > 0) {
    const allProgress = await db.select().from(progress);
    for (const p of allProgress) {
      if (!projectIds.includes(p.projectId)) continue;
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

  return NextResponse.json({
    projects: projectsWithOverdue,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
}

// 新規追加
export async function POST(request: NextRequest) {
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  const validation = await validateBody(request, createProjectSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  try {
    const [result] = await db.insert(projects).values({
      ...validation.data,
      organizationId,
    }).returning();

    await logProjectCreate(user, result.id, result.managementNumber, request);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, "プロジェクトの作成に失敗しました");
  }
}
