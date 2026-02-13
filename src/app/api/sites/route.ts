import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { db, ensureDbReady } from "@/db";
import { savedSites } from "@/db/schema";
import { requireOrganization, requireOrganizationWithCsrf, getUserId } from "@/lib/auth-guard";
import { scoreSite } from "@/lib/site-scoring";

export const dynamic = "force-dynamic";

// 候補地一覧取得
export async function GET() {
  const authResult = await requireOrganization();
  if (!authResult.success) return authResult.response;
  const { organizationId } = authResult;

  await ensureDbReady();
  const rows = await db
    .select()
    .from(savedSites)
    .where(eq(savedSites.organizationId, organizationId))
    .orderBy(desc(savedSites.stars), desc(savedSites.createdAt));

  return NextResponse.json({ sites: rows });
}

// 候補地登録
export async function POST(request: NextRequest) {
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) return authResult.response;
  const { organizationId } = authResult;

  const body = await request.json();
  const { latitude, longitude, address, cityCode, landCategory, areaSqm,
    noushinClass, cityPlanningClass, ownerIntention, isIdleFarmland, memo, dataDate } = body;

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "緯度・経度は必須です" }, { status: 400 });
  }

  // スコア計算
  const result = scoreSite({
    landCategory,
    areaSqm: areaSqm ? Number(areaSqm) : null,
    noushinClass,
    cityPlanningClass,
    ownerIntention,
    isIdleFarmland: !!isIdleFarmland,
  });

  await ensureDbReady();
  const userId = authResult.user ? getUserId(authResult.user) : null;

  const [site] = await db.insert(savedSites).values({
    organizationId,
    latitude: Number(latitude),
    longitude: Number(longitude),
    address: address || null,
    cityCode: cityCode || null,
    landCategory: landCategory || null,
    areaSqm: areaSqm ? Number(areaSqm) : null,
    noushinClass: noushinClass || null,
    cityPlanningClass: cityPlanningClass || null,
    ownerIntention: ownerIntention || null,
    isIdleFarmland: isIdleFarmland ? 1 : 0,
    score: result.score,
    stars: result.stars,
    scoreDetails: JSON.stringify(result.details),
    status: "new",
    memo: memo || null,
    dataSource: "manual",
    dataDate: dataDate || null,
    createdAt: new Date().toISOString(),
    createdBy: userId,
  }).returning();

  return NextResponse.json({ site, scoring: result });
}
