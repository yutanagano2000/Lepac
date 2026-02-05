import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateConstructionSchema, validateBody } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const validation = await validateBody(request, updateConstructionSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const updateData = validation.data;
  console.log("[Construction PATCH] projectId:", projectId, "updateData:", updateData);

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    // プロジェクトを更新
    await db.update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId));

    // 更新後のデータを取得して返す
    const [updated] = await db.select().from(projects).where(eq(projects.id, projectId));

    if (!updated) {
      return NextResponse.json({ error: "プロジェクトが見つかりません" }, { status: 404 });
    }

    console.log("[Construction PATCH] updated project:", {
      id: updated.id,
      mountOrderDate: updated.mountOrderDate,
      mountDeliveryScheduled: updated.mountDeliveryScheduled,
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json({ error: "工事情報の更新に失敗しました" }, { status: 500 });
  }
}
