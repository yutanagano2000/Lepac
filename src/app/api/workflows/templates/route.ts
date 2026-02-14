import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { workflowTemplates, workflowSteps } from "@/db/schema";
import { createWorkflowTemplateSchema, validateBody } from "@/lib/validations";
import { requireOrganization, requireOrganizationWithCsrf, getUserId } from "@/lib/auth-guard";
import { logWorkflowTemplateCreate } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// テンプレート一覧取得
export async function GET() {
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  // JOINを使用して1クエリでテンプレートとステップ統計を取得（N+1問題解決）
  const templatesWithStats = await db
    .select({
      id: workflowTemplates.id,
      name: workflowTemplates.name,
      description: workflowTemplates.description,
      category: workflowTemplates.category,
      isActive: workflowTemplates.isActive,
      createdBy: workflowTemplates.createdBy,
      createdAt: workflowTemplates.createdAt,
      updatedAt: workflowTemplates.updatedAt,
      stepsCount: sql<number>`COALESCE((
        SELECT COUNT(*) FROM workflow_steps
        WHERE workflow_steps.template_id = ${workflowTemplates.id}
      ), 0)`,
      estimatedMinutes: sql<number>`COALESCE((
        SELECT SUM(estimated_minutes) FROM workflow_steps
        WHERE workflow_steps.template_id = ${workflowTemplates.id}
      ), 0)`,
    })
    .from(workflowTemplates)
    .where(eq(workflowTemplates.organizationId, organizationId))
    .orderBy(desc(workflowTemplates.createdAt));

  return NextResponse.json(templatesWithStats);
}

// テンプレート作成
export async function POST(request: NextRequest) {
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  const validation = await validateBody(request, createWorkflowTemplateSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { name, description, category, steps } = validation.data;
  const userId = getUserId(user);

  try {
    // トランザクション的に処理（SQLiteなのでシンプルに順次実行）
    const [template] = await db
      .insert(workflowTemplates)
      .values({
        organizationId,
        name: name.trim(),
        description: description?.trim() ?? null,
        category: category?.trim() ?? null,
        isActive: 1,
        createdBy: userId,
        createdAt: new Date().toISOString(),
      })
      .returning();

    // ステップを挿入
    if (steps.length > 0) {
      await db.insert(workflowSteps).values(
        steps.map((step) => ({
          templateId: template.id,
          stepOrder: step.stepOrder,
          taskType: step.taskType,
          title: step.title.trim(),
          instruction: step.instruction?.trim() ?? null,
          targetUrl: step.targetUrl ?? null,
          requiredFields: step.requiredFields ?? null,
          estimatedMinutes: step.estimatedMinutes ?? null,
        }))
      );
    }

    // 監査ログ記録
    await logWorkflowTemplateCreate(user, template.id, template.name, request);

    return NextResponse.json(
      {
        id: template.id,
        name: template.name,
        stepsCount: steps.length,
        createdAt: template.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to create workflow template:", error);
    }
    return NextResponse.json(
      { error: "ワークフローテンプレートの作成に失敗しました" },
      { status: 500 }
    );
  }
}
