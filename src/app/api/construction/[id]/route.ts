import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateConstructionSchema, validateBody } from "@/lib/validations";
import { requireProjectAccess } from "@/lib/auth-guard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 厳密なID検証: 数字のみで構成されているか確認
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }
  const projectId = Number(id);

  // Number.isSafeInteger で Infinity、小数、範囲外を拒否
  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccess(projectId);
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const validation = await validateBody(request, updateConstructionSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const updateData = validation.data;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    // プロジェクトを更新（組織フィルタリング）+ 全カラムを返す
    const [updated] = await db.update(projects)
      .set(updateData)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
      .returning();

    // 更新対象が存在しない場合は404
    if (!updated) {
      return NextResponse.json({ error: "プロジェクトが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("Failed to update project:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "工事情報の更新に失敗しました" }, { status: 500 });
  }
}
