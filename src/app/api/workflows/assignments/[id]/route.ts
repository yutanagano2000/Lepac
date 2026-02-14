import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  workflowAssignments,
  workflowTemplates,
  workflowSteps,
  workflowExecutions,
  users,
  projects,
} from "@/db/schema";
import { requireOrganization, requireOrganizationWithCsrf } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 割り当て詳細取得
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;
  const { id } = await params;

  const assignmentId = parseInt(id, 10);
  if (isNaN(assignmentId) || assignmentId <= 0) {
    return NextResponse.json({ error: "無効な割り当てIDです" }, { status: 400 });
  }

  // 割り当て取得（組織チェック込み）
  const [assignment] = await db
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
      templateDescription: workflowTemplates.description,
      userName: users.name,
      projectName: projects.managementNumber,
    })
    .from(workflowAssignments)
    .innerJoin(workflowTemplates, eq(workflowAssignments.templateId, workflowTemplates.id))
    .leftJoin(users, eq(workflowAssignments.userId, users.id))
    .leftJoin(projects, eq(workflowAssignments.projectId, projects.id))
    .where(
      and(
        eq(workflowAssignments.id, assignmentId),
        eq(workflowTemplates.organizationId, organizationId)
      )
    );

  if (!assignment) {
    return NextResponse.json({ error: "割り当てが見つかりません" }, { status: 404 });
  }

  // ステップと実行記録を取得
  const steps = await db
    .select({
      id: workflowSteps.id,
      stepOrder: workflowSteps.stepOrder,
      taskType: workflowSteps.taskType,
      title: workflowSteps.title,
      instruction: workflowSteps.instruction,
      targetUrl: workflowSteps.targetUrl,
      estimatedMinutes: workflowSteps.estimatedMinutes,
    })
    .from(workflowSteps)
    .where(eq(workflowSteps.templateId, assignment.templateId))
    .orderBy(asc(workflowSteps.stepOrder));

  const executions = await db
    .select({
      stepId: workflowExecutions.stepId,
      status: workflowExecutions.status,
      startedAt: workflowExecutions.startedAt,
      completedAt: workflowExecutions.completedAt,
      durationSeconds: workflowExecutions.durationSeconds,
      notes: workflowExecutions.notes,
    })
    .from(workflowExecutions)
    .where(eq(workflowExecutions.assignmentId, assignmentId));

  // ステップに実行状態をマージ
  const stepsWithExecution = steps.map((step) => {
    const execution = executions.find((e) => e.stepId === step.id);
    return {
      ...step,
      execution: execution ?? null,
    };
  });

  return NextResponse.json({
    ...assignment,
    totalSteps: steps.length,
    steps: stepsWithExecution,
  });
}

// 割り当てキャンセル
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;
  const { id } = await params;

  const assignmentId = parseInt(id, 10);
  if (isNaN(assignmentId) || assignmentId <= 0) {
    return NextResponse.json({ error: "無効な割り当てIDです" }, { status: 400 });
  }

  // 割り当て存在確認（組織チェック込み）
  const [existing] = await db
    .select({
      id: workflowAssignments.id,
      status: workflowAssignments.status,
    })
    .from(workflowAssignments)
    .innerJoin(workflowTemplates, eq(workflowAssignments.templateId, workflowTemplates.id))
    .where(
      and(
        eq(workflowAssignments.id, assignmentId),
        eq(workflowTemplates.organizationId, organizationId)
      )
    );

  if (!existing) {
    return NextResponse.json({ error: "割り当てが見つかりません" }, { status: 404 });
  }

  if (existing.status === "completed") {
    return NextResponse.json({ error: "完了済みの割り当てはキャンセルできません" }, { status: 400 });
  }

  try {
    await db
      .update(workflowAssignments)
      .set({
        status: "cancelled",
        completedAt: new Date().toISOString(),
      })
      .where(eq(workflowAssignments.id, assignmentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to cancel workflow assignment:", error);
    }
    return NextResponse.json({ error: "ワークフローのキャンセルに失敗しました" }, { status: 500 });
  }
}
