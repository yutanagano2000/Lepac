import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import { eq, asc, sql, like, or, and, inArray } from "drizzle-orm";
import { calculateWorkflowTimelineFromCompletion } from "@/lib/timeline";
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
 *   ids      — カンマ区切りのプロジェクトID（フィルタリング用）
 */
export async function GET(request: NextRequest) {
  const authResult = await requireOrganization();
  if (!authResult.success) return authResult.response;
  const { organizationId } = authResult;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
  const rawSearchQuery = url.searchParams.get("q")?.trim() || "";
  const sortDir = url.searchParams.get("sort") === "desc" ? "desc" : "asc";
  const offset = (page - 1) * limit;

  // IDフィルタリング（カンマ区切り、最大200件）
  const idsParam = url.searchParams.get("ids");
  const filterIds = idsParam
    ? idsParam.split(",").map(Number).filter(n => !isNaN(n) && n > 0).slice(0, 200)
    : [];

  // 検索クエリの長さ制限（DoS対策）
  const MAX_SEARCH_LENGTH = 100;
  const searchQuery = rawSearchQuery.slice(0, MAX_SEARCH_LENGTH);

  // WHERE条件を構築
  const conditions = [eq(projects.organizationId, organizationId)];

  if (filterIds.length > 0) {
    conditions.push(inArray(projects.id, filterIds));
  }

  if (searchQuery) {
    // LIKE演算子の特殊文字をエスケープ
    const escapedQuery = searchQuery
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    const pattern = `%${escapedQuery}%`;
    conditions.push(
      or(
        like(projects.managementNumber, pattern),
        like(projects.projectNumber, pattern),
        like(projects.address, pattern),
        like(projects.landowner1, pattern),
        like(projects.landowner2, pattern),
        like(projects.landowner3, pattern),
        like(projects.landowner, pattern),
        like(projects.landownerAddress, pattern),
      )!
    );
  }

  const whereClause = and(...conditions);

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

  // 超過判定: 対象案件のみ取得（全件スキャンを回避）
  const projectIds = pageProjects.map((p) => p.id);
  const progressByProject = new Map<number, typeof progress.$inferSelect[]>();

  if (projectIds.length > 0) {
    // IN句で対象案件のProgressのみ取得（O(n)→O(対象件数)に改善）
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
        // createdAtは予定日（スキーマコメント参照）として使用
        // ローカル日付としてパースしてUTC問題を回避
        const dateStr = p.createdAt.split("T")[0];
        const parts = dateStr.split("-");
        if (parts.length !== 3) return false;
        const [y, m, d] = parts.map(Number);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
        const dueDate = new Date(y, m - 1, d);
        return dueDate.getTime() < now.getTime();
      });
    } else if (project.completionMonth) {
      const timeline = calculateWorkflowTimelineFromCompletion(project.completionMonth);
      hasOverdue = timeline.some((phase) => {
        const phaseDate = phase.startDate || phase.endDate;
        return phaseDate ? phaseDate.getTime() < now.getTime() : false;
      });
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
