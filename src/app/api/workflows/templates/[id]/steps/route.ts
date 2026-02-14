import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { workflowTemplates, workflowSteps } from "@/db/schema";
import { addWorkflowStepSchema, validateBody } from "@/lib/validations";
import { requireOrganization, requireOrganizationWithCsrf } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ステップ一覧取得
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

  const steps = await db
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.templateId, templateId))
    .orderBy(asc(workflowSteps.stepOrder));

  return NextResponse.json(steps);
}

// ステップ追加
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

  const validation = await validateBody(request, addWorkflowStepSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { stepOrder, taskType, title, instruction, targetUrl, requiredFields, estimatedMinutes } =
    validation.data;

  try {
    const [step] = await db
      .insert(workflowSteps)
      .values({
        templateId,
        stepOrder,
        taskType,
        title: title.trim(),
        instruction: instruction?.trim() ?? null,
        targetUrl: targetUrl ?? null,
        requiredFields: requiredFields ?? null,
        estimatedMinutes: estimatedMinutes ?? null,
      })
      .returning();

    // テンプレートの更新日時を更新
    await db
      .update(workflowTemplates)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(workflowTemplates.id, templateId));

    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to add workflow step:", error);
    }
    return NextResponse.json({ error: "ステップの追加に失敗しました" }, { status: 500 });
  }
}
