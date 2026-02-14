import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  workflowAssignments,
  workflowTemplates,
  workflowSteps,
  workflowExecutions,
  users,
  projects,
} from "@/db/schema";
import { createWorkflowAssignmentSchema, validateBody } from "@/lib/validations";
import { requireOrganization, requireOrganizationWithCsrf, getUserId } from "@/lib/auth-guard";
import { logWorkflowAssignmentCreate } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// 割り当て一覧取得
export async function GET(request: NextRequest) {
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const userIdFilter = searchParams.get("userId");

  // 組織内のテンプレートIDを取得
  const orgTemplates = await db
    .select({ id: workflowTemplates.id })
    .from(workflowTemplates)
    .where(eq(workflowTemplates.organizationId, organizationId));

  const templateIds = orgTemplates.map((t) => t.id);
  if (templateIds.length === 0) {
    return NextResponse.json([]);
  }

  // 条件構築
  const conditions = [inArray(workflowAssignments.templateId, templateIds)];
  if (statusFilter && ["pending", "in_progress", "completed", "cancelled"].includes(statusFilter)) {
    conditions.push(eq(workflowAssignments.status, statusFilter));
  }
  if (userIdFilter) {
    const userId = parseInt(userIdFilter, 10);
    if (!isNaN(userId) && userId > 0) {
      conditions.push(eq(workflowAssignments.userId, userId));
    }
  }

  const assignments = await db
    .select({
      id: workflowAssignments.id,
      templateId: workflowAssignments.templateId,
      userId: workflowAssignments.userId,
      projectId: workflowAssignments.projectId,
      assignedBy: workflowAssignments.assignedBy,
      status: workflowAssignments.status,
      currentStep: workflowAssignments.currentStep,
      dueDate: workflowAssignments.dueDate,
      priority: workflowAssignments.priority,
      startedAt: workflowAssignments.startedAt,
      completedAt: workflowAssignments.completedAt,
      createdAt: workflowAssignments.createdAt,
      templateName: workflowTemplates.name,
      userName: users.name,
      projectName: projects.managementNumber,
    })
    .from(workflowAssignments)
    .innerJoin(workflowTemplates, eq(workflowAssignments.templateId, workflowTemplates.id))
    .leftJoin(users, eq(workflowAssignments.userId, users.id))
    .leftJoin(projects, eq(workflowAssignments.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(desc(workflowAssignments.createdAt));

  // テンプレート毎のステップ数を一括取得（N+1回避）
  const uniqueTemplateIds = [...new Set(assignments.map((a) => a.templateId))];
  const stepCounts = await db
    .select({
      templateId: workflowSteps.templateId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(workflowSteps)
    .where(inArray(workflowSteps.templateId, uniqueTemplateIds))
    .groupBy(workflowSteps.templateId);

  const stepCountMap = new Map(stepCounts.map((s) => [s.templateId, s.count]));

  const assignmentsWithStats = assignments.map((assignment) => ({
    ...assignment,
    totalSteps: stepCountMap.get(assignment.templateId) ?? 0,
  }));

  return NextResponse.json(assignmentsWithStats);
}

// 割り当て作成
export async function POST(request: NextRequest) {
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  const validation = await validateBody(request, createWorkflowAssignmentSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { templateId, userId, projectId, dueDate, priority } = validation.data;
  const assignedBy = getUserId(user);

  // テンプレート存在確認（組織チェック込み）
  const [template] = await db
    .select({ id: workflowTemplates.id, name: workflowTemplates.name, isActive: workflowTemplates.isActive })
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

  if (template.isActive === 0) {
    return NextResponse.json({ error: "無効なテンプレートです" }, { status: 400 });
  }

  // 担当者存在確認（組織チェック込み）
  const [assignee] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)));

  if (!assignee) {
    return NextResponse.json({ error: "担当者が見つかりません" }, { status: 404 });
  }

  // 案件存在確認（指定時のみ）
  if (projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)));

    if (!project) {
      return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
    }
  }

  try {
    const [assignment] = await db
      .insert(workflowAssignments)
      .values({
        templateId,
        userId,
        projectId: projectId ?? null,
        assignedBy,
        status: "pending",
        currentStep: 1,
        dueDate: dueDate ?? null,
        priority: priority ?? 2,
        createdAt: new Date().toISOString(),
      })
      .returning();

    // ステップの実行記録を初期化
    const steps = await db
      .select({ id: workflowSteps.id })
      .from(workflowSteps)
      .where(eq(workflowSteps.templateId, templateId));

    if (steps.length > 0) {
      await db.insert(workflowExecutions).values(
        steps.map((step) => ({
          assignmentId: assignment.id,
          stepId: step.id,
          status: "pending",
        }))
      );
    }

    // 監査ログ記録
    await logWorkflowAssignmentCreate(user, assignment.id, template.name, userId, request);

    return NextResponse.json(
      {
        id: assignment.id,
        templateName: template.name,
        status: assignment.status,
        createdAt: assignment.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to create workflow assignment:", error);
    }
    return NextResponse.json({ error: "ワークフローの割り当てに失敗しました" }, { status: 500 });
  }
}
