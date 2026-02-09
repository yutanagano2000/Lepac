import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { slopeAnalyses } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireOrganization, requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().max(200).optional(),
  polygon: z.array(z.tuple([z.number(), z.number()])).min(4),
  gridInterval: z.number().int().min(1).max(50).default(2),
  totalPoints: z.number().int().positive(),
  avgSlope: z.number().optional(),
  maxSlope: z.number().optional(),
  minSlope: z.number().optional(),
  flatPercent: z.number().optional(),
  steepPercent: z.number().optional(),
  avgElevation: z.number().optional(),
  maxElevation: z.number().optional(),
  minElevation: z.number().optional(),
  elevationMatrix: z.array(z.array(z.number().nullable())).optional(),
  slopeMatrix: z.array(z.array(z.number().nullable())).optional(),
  crossSection: z.array(z.object({
    distance: z.number(),
    elevation: z.number(),
    lat: z.number(),
    lon: z.number(),
  })).nullable().optional(),
});

// 解析結果一覧取得
export async function GET(request: NextRequest) {
  const authResult = await requireOrganization();
  if (!authResult.success) return authResult.response;
  const { organizationId } = authResult;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const conditions = [eq(slopeAnalyses.organizationId, organizationId)];
  if (projectId) {
    const parsedProjectId = parseInt(projectId, 10);
    if (isNaN(parsedProjectId) || parsedProjectId <= 0) {
      return NextResponse.json({ error: "無効なprojectIdです" }, { status: 400 });
    }
    conditions.push(eq(slopeAnalyses.projectId, parsedProjectId));
  }

  const results = await db
    .select({
      id: slopeAnalyses.id,
      projectId: slopeAnalyses.projectId,
      name: slopeAnalyses.name,
      totalPoints: slopeAnalyses.totalPoints,
      avgSlope: slopeAnalyses.avgSlope,
      maxSlope: slopeAnalyses.maxSlope,
      flatPercent: slopeAnalyses.flatPercent,
      steepPercent: slopeAnalyses.steepPercent,
      createdAt: slopeAnalyses.createdAt,
    })
    .from(slopeAnalyses)
    .where(and(...conditions))
    .orderBy(desc(slopeAnalyses.createdAt));

  return NextResponse.json(results);
}

// 解析結果保存
export async function POST(request: NextRequest) {
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) return authResult.response;
  const { user, organizationId } = authResult;

  try {
    const body = await request.json();
    const validation = createSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "バリデーションエラー", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const now = new Date().toISOString();

    const [result] = await db
      .insert(slopeAnalyses)
      .values({
        projectId: data.projectId,
        organizationId,
        name: data.name || "傾斜解析",
        polygon: JSON.stringify(data.polygon),
        gridInterval: data.gridInterval,
        totalPoints: data.totalPoints,
        avgSlope: data.avgSlope,
        maxSlope: data.maxSlope,
        minSlope: data.minSlope,
        flatPercent: data.flatPercent,
        steepPercent: data.steepPercent,
        avgElevation: data.avgElevation,
        maxElevation: data.maxElevation,
        minElevation: data.minElevation,
        elevationMatrix: data.elevationMatrix ? JSON.stringify(data.elevationMatrix) : null,
        slopeMatrix: data.slopeMatrix ? JSON.stringify(data.slopeMatrix) : null,
        crossSection: data.crossSection ? JSON.stringify(data.crossSection) : null,
        createdAt: now,
        createdBy: parseInt(user.id, 10),
      })
      .returning();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Slope analysis save error:", error);
    return NextResponse.json(
      { error: "傾斜解析の保存に失敗しました" },
      { status: 500 }
    );
  }
}
