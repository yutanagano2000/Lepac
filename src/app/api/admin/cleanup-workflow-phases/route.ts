import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { progress, projects } from "@/db/schema";
import { inArray, eq, and, sql, asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-guard";
import { validateCsrf } from "@/lib/csrf-protection";

/**
 * POST /api/admin/cleanup-workflow-phases
 *
 * 旧PHASE_OFFSETSベースの不要な進捗項目を全案件から削除
 * WORKFLOW_PHASESへの移行に伴い不要になった項目を対象とする
 */

// 旧PHASE_OFFSETSベースの項目（削除対象）
const OLD_PHASE_TITLES = [
  "農振申請",
  "電力申請",
  "現調",
  "案件提出",
  "SS依頼",
  "電力回答",
  "法令申請",
  "土地契約",
  "着工",
  "SS実施",
  "土地決済",
  "完工",
  "連系",
  // レガシー名称
  "現地調査",
  "農転・地目申請",
  "連系（発電開始）",
];

export async function POST(request: NextRequest) {
  // CSRF保護（破壊的操作のため必須）
  const csrfResult = validateCsrf(request);
  if (!csrfResult.valid) {
    return NextResponse.json({ error: csrfResult.error }, { status: 403 });
  }

  // 管理者権限チェック（CRITICAL: 組織メンバーではなく管理者のみ許可）
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult.response;
  }

  const { organizationId } = authResult;

  try {
    // サブクエリで組織内プロジェクトを指定（大規模inArray回避でパフォーマンス向上）
    const orgProjectSubquery = db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.organizationId, organizationId));

    // 削除前に件数を取得（.returning()による大量データ取得を回避）
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(progress)
      .where(
        and(
          inArray(progress.title, OLD_PHASE_TITLES),
          sql`${progress.projectId} IN (${orgProjectSubquery})`
        )
      );

    const deleteCount = Number(countResult[0]?.count ?? 0);

    if (deleteCount === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: "No matching items to delete",
      });
    }

    // 組織内のプロジェクトに限定してWORKFLOW_PHASESベースの項目を削除
    await db
      .delete(progress)
      .where(
        and(
          inArray(progress.title, OLD_PHASE_TITLES),
          sql`${progress.projectId} IN (${orgProjectSubquery})`
        )
      );

    return NextResponse.json({
      success: true,
      deleted: deleteCount,
    });
  } catch (error) {
    console.error("Cleanup failed:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // 削除対象の項目を確認（プレビュー）- 管理者のみ
  const authResult = await requireAdmin();
  if (!authResult.success) {
    return authResult.response;
  }

  const { organizationId } = authResult;

  // ページネーション（デフォルト100件、最大500件）
  const url = new URL(request.url);
  const parsedLimit = parseInt(url.searchParams.get("limit") ?? "", 10);
  const parsedOffset = parseInt(url.searchParams.get("offset") ?? "", 10);
  const limit = Math.min(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100, 500);
  const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  try {
    // サブクエリで組織内プロジェクトを指定（大規模inArray回避）
    const orgProjectSubquery = db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.organizationId, organizationId));

    // 組織内のプロジェクトに限定してプレビュー（ページネーション付き）
    // orderBy追加で一貫したページネーション結果を保証
    const items = await db
      .select({
        id: progress.id,
        projectId: progress.projectId,
        title: progress.title,
      })
      .from(progress)
      .where(
        and(
          inArray(progress.title, OLD_PHASE_TITLES),
          sql`${progress.projectId} IN (${orgProjectSubquery})`
        )
      )
      .orderBy(asc(progress.id))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      count: items.length,
      items,
      pagination: { limit, offset, hasMore: items.length === limit },
    });
  } catch (error) {
    console.error("Preview failed:", error);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}
