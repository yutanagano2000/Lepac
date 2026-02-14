import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  workflowAssignments,
  workflowTemplates,
  workflowSteps,
  workflowExecutions,
  projects,
} from "@/db/schema";
import { requireOrganization, getUserId } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

// 現在のタスク取得
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;
  const userId = getUserId(user);
  const { assignmentId: assignmentIdStr } = await params;

  const assignmentId = parseInt(assignmentIdStr, 10);
  if (isNaN(assignmentId) || assignmentId <= 0) {
    return NextResponse.json({ error: "無効な割り当てIDです" }, { status: 400 });
  }

  // 割り当て取得（自分宛てかつ組織チェック）
  const [assignment] = await db
    .select({
      id: workflowAssignments.id,
      templateId: workflowAssignments.templateId,
      projectId: workflowAssignments.projectId,
      status: workflowAssignments.status,
      currentStep: workflowAssignments.currentStep,
      dueDate: workflowAssignments.dueDate,
      startedAt: workflowAssignments.startedAt,
      templateName: workflowTemplates.name,
      projectName: projects.managementNumber,
    })
    .from(workflowAssignments)
    .innerJoin(workflowTemplates, eq(workflowAssignments.templateId, workflowTemplates.id))
    .leftJoin(projects, eq(workflowAssignments.projectId, projects.id))
    .where(
      and(
        eq(workflowAssignments.id, assignmentId),
        eq(workflowAssignments.userId, userId),
        eq(workflowTemplates.organizationId, organizationId)
      )
    );

  if (!assignment) {
    return NextResponse.json({ error: "割り当てが見つかりません" }, { status: 404 });
  }

  // 全ステップ取得
  const steps = await db
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.templateId, assignment.templateId))
    .orderBy(asc(workflowSteps.stepOrder));

  const totalSteps = steps.length;

  // 完了済みステップの実行記録を取得
  const completedExecutions = await db
    .select({
      stepId: workflowExecutions.stepId,
      stepOrder: workflowSteps.stepOrder,
      title: workflowSteps.title,
      completedAt: workflowExecutions.completedAt,
      durationSeconds: workflowExecutions.durationSeconds,
    })
    .from(workflowExecutions)
    .innerJoin(workflowSteps, eq(workflowExecutions.stepId, workflowSteps.id))
    .where(
      and(
        eq(workflowExecutions.assignmentId, assignmentId),
        eq(workflowExecutions.status, "completed")
      )
    )
    .orderBy(asc(workflowSteps.stepOrder));

  // 現在のステップを取得
  const currentStepData = steps.find((s) => s.stepOrder === assignment.currentStep);

  if (!currentStepData && assignment.status !== "completed") {
    return NextResponse.json({ error: "現在のステップが見つかりません" }, { status: 500 });
  }

  // 現在のステップの実行記録を取得
  let currentExecution = null;
  if (currentStepData) {
    const [exec] = await db
      .select()
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.assignmentId, assignmentId),
          eq(workflowExecutions.stepId, currentStepData.id)
        )
      );
    currentExecution = exec;
  }

  return NextResponse.json({
    assignment: {
      id: assignment.id,
      workflowName: assignment.templateName,
      projectName: assignment.projectName,
      status: assignment.status,
      totalSteps,
      currentStep: assignment.currentStep,
      startedAt: assignment.startedAt,
      dueDate: assignment.dueDate,
    },
    currentTask: currentStepData
      ? {
          stepId: currentStepData.id,
          stepOrder: currentStepData.stepOrder,
          taskType: currentStepData.taskType,
          title: currentStepData.title,
          instruction: currentStepData.instruction,
          targetUrl: currentStepData.targetUrl,
          estimatedMinutes: currentStepData.estimatedMinutes,
          startedAt: currentExecution?.startedAt ?? null,
        }
      : null,
    previousSteps: completedExecutions.map((e) => ({
      stepOrder: e.stepOrder,
      title: e.title,
      completedAt: e.completedAt,
      durationSeconds: e.durationSeconds,
    })),
  });
}
