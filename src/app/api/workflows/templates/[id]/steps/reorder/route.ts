import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { workflowTemplates, workflowSteps } from "@/db/schema";
import { reorderWorkflowStepsSchema, validateBody } from "@/lib/validations";
import { requireOrganizationWithCsrf } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ステップ並び替え
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;
  const { id } = await params;

  const templateId = parseInt(id, 10);
  if (isNaN(templateId) || templateId <= 0) {
    return NextResponse.json({ error: "無効なテンプレートIDです" }, { status: 400 });
  }

  // テンプレート存在確認（組織チェック込み）
  const [template] = await db
    .select({ id: workflowTemplates.id })
    .from(workflowTemplates)
    .where(
      and(
        eq(workflowTemplates.id, templateId),
        eq(workflowTemplates.organizationId, organizationId)
      )
    );

  if (!template) {
    return NextResponse.json({ error: "テンプレートが見つかりません" }, { status: 404 });
  }

  const validation = await validateBody(request, reorderWorkflowStepsSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { stepIds } = validation.data;

  // 指定されたステップが全てこのテンプレートに属しているか確認
  const existingSteps = await db
    .select({ id: workflowSteps.id })
    .from(workflowSteps)
    .where(
      and(eq(workflowSteps.templateId, templateId), inArray(workflowSteps.id, stepIds))
    );

  if (existingSteps.length !== stepIds.length) {
    return NextResponse.json(
      { error: "一部のステップが見つかりません" },
      { status: 400 }
    );
  }

  try {
    // 順番を順次更新（トランザクション代替：順序保証のため逐次処理）
    for (let i = 0; i < stepIds.length; i++) {
      await db
        .update(workflowSteps)
        .set({ stepOrder: i + 1 })
        .where(eq(workflowSteps.id, stepIds[i]));
    }

    // テンプレートの更新日時を更新
    await db
      .update(workflowTemplates)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(workflowTemplates.id, templateId));

    return NextResponse.json({ success: true, order: stepIds });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to reorder workflow steps:", error);
    }
    return NextResponse.json({ error: "ステップの並び替えに失敗しました" }, { status: 500 });
  }
}
