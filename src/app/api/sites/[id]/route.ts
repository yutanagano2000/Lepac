import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, ensureDbReady } from "@/db";
import { savedSites } from "@/db/schema";
import { requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { scoreSite } from "@/lib/site-scoring";

export const dynamic = "force-dynamic";

// 候補地更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) return authResult.response;
  const { organizationId } = authResult;
  const { id } = await params;
  const siteId = parseInt(id, 10);

  const body = await request.json();
  await ensureDbReady();

  // スコア再計算（属性変更時）
  const hasAttrChange = body.noushinClass !== undefined || body.cityPlanningClass !== undefined
    || body.ownerIntention !== undefined || body.areaSqm !== undefined || body.isIdleFarmland !== undefined;

  let updateData: Record<string, unknown> = {};

  if (hasAttrChange) {
    // 既存データ取得
    const [existing] = await db.select().from(savedSites)
      .where(and(eq(savedSites.id, siteId), eq(savedSites.organizationId, organizationId)));
    if (!existing) return NextResponse.json({ error: "候補地が見つかりません" }, { status: 404 });

    const merged = { ...existing, ...body };
    const result = scoreSite({
      landCategory: merged.landCategory,
      areaSqm: merged.areaSqm,
      noushinClass: merged.noushinClass,
      cityPlanningClass: merged.cityPlanningClass,
      ownerIntention: merged.ownerIntention,
      isIdleFarmland: !!merged.isIdleFarmland,
    });
    updateData = { ...body, score: result.score, stars: result.stars, scoreDetails: JSON.stringify(result.details) };
  } else {
    updateData = body;
  }

  // isIdleFarmlandをintに変換
  if (updateData.isIdleFarmland !== undefined) {
    updateData.isIdleFarmland = updateData.isIdleFarmland ? 1 : 0;
  }

  await db.update(savedSites).set(updateData)
    .where(and(eq(savedSites.id, siteId), eq(savedSites.organizationId, organizationId)));

  return NextResponse.json({ success: true });
}

// 候補地削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) return authResult.response;
  const { organizationId } = authResult;
  const { id } = await params;
  const siteId = parseInt(id, 10);

  await ensureDbReady();
  await db.delete(savedSites)
    .where(and(eq(savedSites.id, siteId), eq(savedSites.organizationId, organizationId)));

  return NextResponse.json({ success: true });
}
