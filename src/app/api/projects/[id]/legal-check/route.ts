import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { createErrorResponse } from "@/lib/api-error";
import { parseCoordinateString } from "@/lib/coordinates";
import { performLegalAutoCheck, type LegalCheckResults } from "@/lib/legal-checker";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  try {
    const { id } = await params;
    const projectId = Number(id);

    // プロジェクト取得
    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { error: "プロジェクトが見つかりません" },
        { status: 404 }
      );
    }

    // 座標パース
    const coords = project.coordinates
      ? parseCoordinateString(project.coordinates)
      : null;
    if (!coords) {
      return NextResponse.json(
        { error: "座標が登録されていません。先に座標を登録してください。" },
        { status: 400 }
      );
    }

    // 地目リスト構築
    const landCategories: string[] = [
      project.landCategory1,
      project.landCategory2,
      project.landCategory3,
    ].filter((c): c is string => !!c);

    // 自動チェック実行
    const autoResults = await performLegalAutoCheck({
      lat: parseFloat(coords.lat),
      lon: parseFloat(coords.lon),
      address: project.address || null,
      landCategories,
    });

    // 既存の法令ステータスを取得
    let existingStatuses: Record<string, { status: string; note?: string; [key: string]: unknown }> = {};
    if (project.legalStatuses) {
      try {
        existingStatuses = JSON.parse(project.legalStatuses);
      } catch {
        existingStatuses = {};
      }
    }

    // マージ: 既に手動入力されている法令は上書きしない
    const merged: Record<string, unknown> = { ...existingStatuses };
    const autoApplied: string[] = [];

    for (const [lawName, result] of Object.entries(autoResults)) {
      if (!existingStatuses[lawName]) {
        merged[lawName] = {
          ...result,
          updatedBy: "自動チェック",
          updatedAt: new Date().toISOString(),
        };
        autoApplied.push(lawName);
      }
    }

    // DB保存
    await db
      .update(projects)
      .set({ legalStatuses: JSON.stringify(merged) })
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId)
        )
      );

    return NextResponse.json({
      legalStatuses: merged,
      autoApplied,
      totalChecked: Object.keys(autoResults).length,
      skipped: Object.keys(autoResults).length - autoApplied.length,
    });
  } catch (error) {
    return createErrorResponse(error, "法令自動チェックに失敗しました");
  }
}
