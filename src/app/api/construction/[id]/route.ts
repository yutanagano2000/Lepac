import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";

// 許可されたフィールド（工事部向け日付フィールド）
const ALLOWED_FIELDS = new Set([
  "mountOrderDate",
  "mountDeliveryScheduled",
  "panelOrderDate",
  "panelDeliveryScheduled",
  "constructionAvailableDate",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const body = await request.json();
    console.log("[Construction PATCH] projectId:", projectId, "body:", body);

    // 更新データを構築（許可されたフィールドのみ、キャメルケースのまま）
    const updateData: Record<string, string | null> = {};

    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        updateData[key] = value as string | null;
      }
    }

    console.log("[Construction PATCH] updateData:", updateData);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // プロジェクトを更新（Drizzleはキャメルケースのプロパティ名を使用）
    await db.update(projects)
      .set(updateData as any)
      .where(eq(projects.id, projectId));

    // 更新後のデータを取得して返す
    const [updated] = await db.select().from(projects).where(eq(projects.id, projectId));
    console.log("[Construction PATCH] updated project:", {
      id: updated?.id,
      mountOrderDate: updated?.mountOrderDate,
      mountDeliveryScheduled: updated?.mountDeliveryScheduled,
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}
