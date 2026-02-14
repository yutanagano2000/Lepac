import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { workflowTemplates, workflowSteps } from "@/db/schema";
import { updateWorkflowStepSchema, validateBody } from "@/lib/validations";
import { requireOrganizationWithCsrf } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; stepId: string }>;
}

// ステップ更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;
  const { id, stepId } = await params;

  const templateId = parseInt(id, 10);
  const stepIdNum = parseInt(stepId, 10);
  if (isNaN(templateId) || templateId <= 0 || isNaN(stepIdNum) || stepIdNum <= 0) {
    return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
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

  // ステップ存在確認
  const [existingStep] = await db
    .select({ id: workflowSteps.id })
    .from(workflowSteps)
    .where(and(eq(workflowSteps.id, stepIdNum), eq(workflowSteps.templateId, templateId)));

  if (!existingStep) {
    return NextResponse.json({ error: "ステップが見つかりません" }, { status: 404 });
  }

  const validation = await validateBody(request, updateWorkflowStepSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { stepOrder, taskType, title, instruction, targetUrl, requiredFields, estimatedMinutes } =
    validation.data;

  try {
    const [updated] = await db
      .update(workflowSteps)
      .set({
        ...(stepOrder !== undefined && { stepOrder }),
        ...(taskType !== undefined && { taskType }),
        ...(title !== undefined && { title: title.trim() }),
        ...(instruction !== undefined && { instruction: instruction?.trim() ?? null }),
        ...(targetUrl !== undefined && { targetUrl }),
        ...(requiredFields !== undefined && { requiredFields }),
        ...(estimatedMinutes !== undefined && { estimatedMinutes }),
      })
      .where(eq(workflowSteps.id, stepIdNum))
      .returning();

    // テンプレートの更新日時を更新
    await db
      .update(workflowTemplates)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(workflowTemplates.id, templateId));

    return NextResponse.json(updated);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to update workflow step:", error);
    }
    return NextResponse.json({ error: "ステップの更新に失敗しました" }, { status: 500 });
  }
}

// ステップ削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;
  const { id, stepId } = await params;

  const templateId = parseInt(id, 10);
  const stepIdNum = parseInt(stepId, 10);
  if (isNaN(templateId) || templateId <= 0 || isNaN(stepIdNum) || stepIdNum <= 0) {
    return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
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

  // ステップ存在確認
  const [existingStep] = await db
    .select({ id: workflowSteps.id })
    .from(workflowSteps)
    .where(and(eq(workflowSteps.id, stepIdNum), eq(workflowSteps.templateId, templateId)));

  if (!existingStep) {
    return NextResponse.json({ error: "ステップが見つかりません" }, { status: 404 });
  }

  try {
    await db.delete(workflowSteps).where(eq(workflowSteps.id, stepIdNum));

    // 残りのステップのstepOrderを再計算（順序の整合性を維持）
    const remainingSteps = await db
      .select({ id: workflowSteps.id })
      .from(workflowSteps)
      .where(eq(workflowSteps.templateId, templateId))
      .orderBy(asc(workflowSteps.stepOrder));

    for (let i = 0; i < remainingSteps.length; i++) {
      await db
        .update(workflowSteps)
        .set({ stepOrder: i + 1 })
        .where(eq(workflowSteps.id, remainingSteps[i].id));
    }

    // テンプレートの更新日時を更新
    await db
      .update(workflowTemplates)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(workflowTemplates.id, templateId));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to delete workflow step:", error);
    }
    return NextResponse.json({ error: "ステップの削除に失敗しました" }, { status: 500 });
  }
}
