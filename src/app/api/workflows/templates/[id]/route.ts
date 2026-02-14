import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { workflowTemplates, workflowSteps } from "@/db/schema";
import { updateWorkflowTemplateSchema, validateBody } from "@/lib/validations";
import { requireOrganization, requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { logWorkflowTemplateDelete } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// テンプレート詳細取得
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;
  const { id } = await params;

  const templateId = parseInt(id, 10);
  if (isNaN(templateId) || templateId <= 0) {
    return NextResponse.json({ error: "無効なテンプレートIDです" }, { status: 400 });
  }

  // テンプレート取得（組織チェック込み）
  const [template] = await db
    .select()
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

  // ステップ取得
  const steps = await db
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.templateId, templateId))
    .orderBy(asc(workflowSteps.stepOrder));

  const totalEstimatedMinutes = steps.reduce(
    (sum, step) => sum + (step.estimatedMinutes ?? 0),
    0
  );

  return NextResponse.json({
    ...template,
    steps,
    stepsCount: steps.length,
    estimatedMinutes: totalEstimatedMinutes,
  });
}

// テンプレート更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
  const [existing] = await db
    .select({ id: workflowTemplates.id })
    .from(workflowTemplates)
    .where(
      and(
        eq(workflowTemplates.id, templateId),
        eq(workflowTemplates.organizationId, organizationId)
      )
    );

  if (!existing) {
    return NextResponse.json({ error: "テンプレートが見つかりません" }, { status: 404 });
  }

  const validation = await validateBody(request, updateWorkflowTemplateSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { name, description, category, isActive } = validation.data;

  try {
    const [updated] = await db
      .update(workflowTemplates)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() ?? null }),
        ...(category !== undefined && { category: category?.trim() ?? null }),
        ...(isActive !== undefined && { isActive: isActive ? 1 : 0 }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(workflowTemplates.id, templateId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to update workflow template:", error);
    }
    return NextResponse.json(
      { error: "ワークフローテンプレートの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// テンプレート削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;
  const { id } = await params;

  const templateId = parseInt(id, 10);
  if (isNaN(templateId) || templateId <= 0) {
    return NextResponse.json({ error: "無効なテンプレートIDです" }, { status: 400 });
  }

  // テンプレート存在確認（組織チェック込み）
  const [existing] = await db
    .select({ id: workflowTemplates.id, name: workflowTemplates.name })
    .from(workflowTemplates)
    .where(
      and(
        eq(workflowTemplates.id, templateId),
        eq(workflowTemplates.organizationId, organizationId)
      )
    );

  if (!existing) {
    return NextResponse.json({ error: "テンプレートが見つかりません" }, { status: 404 });
  }

  try {
    // ステップも一緒に削除（CASCADE設定済みだが明示的に）
    await db.delete(workflowSteps).where(eq(workflowSteps.templateId, templateId));
    await db.delete(workflowTemplates).where(eq(workflowTemplates.id, templateId));

    // 監査ログ記録
    await logWorkflowTemplateDelete(user, templateId, existing.name, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to delete workflow template:", error);
    }
    return NextResponse.json(
      { error: "ワークフローテンプレートの削除に失敗しました" },
      { status: 500 }
    );
  }
}
