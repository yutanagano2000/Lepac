import { redirect } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  workflowAssignments,
  workflowTemplates,
  workflowSteps,
  workflowExecutions,
  projects,
} from "@/db/schema";
import { requireOrganization } from "@/lib/auth-guard";
import { TaskExecutionView } from "./_components";
import type { TaskExecutionData, CurrentTask, PreviousStep } from "./_types";

interface PageProps {
  params: Promise<{ assignmentId: string }>;
}

export default async function TaskExecutionPage({ params }: PageProps) {
  const { assignmentId } = await params;
  const authResult = await requireOrganization();
  if (!authResult.success) {
    redirect("/login");
  }
  const userId = Number(authResult.user.id);

  // アサインメント取得
  const [assignment] = await db
    .select({
      id: workflowAssignments.id,
      templateId: workflowAssignments.templateId,
      projectId: workflowAssignments.projectId,
      status: workflowAssignments.status,
      currentStep: workflowAssignments.currentStep,
      startedAt: workflowAssignments.startedAt,
      dueDate: workflowAssignments.dueDate,
    })
    .from(workflowAssignments)
    .where(
      and(
        eq(workflowAssignments.id, Number(assignmentId)),
        eq(workflowAssignments.userId, userId)
      )
    )
    .limit(1);

  if (!assignment) {
    redirect("/workflows");
  }

  // テンプレート情報取得
  const [template] = await db
    .select({ name: workflowTemplates.name })
    .from(workflowTemplates)
    .where(eq(workflowTemplates.id, assignment.templateId))
    .limit(1);

  // 案件名取得
  let projectName: string | null = null;
  if (assignment.projectId) {
    const [project] = await db
      .select({ client: projects.client, managementNumber: projects.managementNumber })
      .from(projects)
      .where(eq(projects.id, assignment.projectId))
      .limit(1);
    projectName = project ? `${project.managementNumber} ${project.client}` : null;
  }

  // ステップ一覧取得
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

  // 現在のタスク取得
  let currentTask: CurrentTask | null = null;
  const currentStepData = steps.find(
    (s) => s.stepOrder === assignment.currentStep
  );

  if (currentStepData && assignment.status !== "completed") {
    // 現在のステップの実行情報取得
    const [currentExecution] = await db
      .select({ startedAt: workflowExecutions.startedAt })
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.assignmentId, assignment.id),
          eq(workflowExecutions.stepId, currentStepData.id)
        )
      )
      .limit(1);

    currentTask = {
      stepId: currentStepData.id,
      stepOrder: currentStepData.stepOrder,
      taskType: currentStepData.taskType as CurrentTask["taskType"],
      title: currentStepData.title,
      instruction: currentStepData.instruction,
      targetUrl: currentStepData.targetUrl,
      estimatedMinutes: currentStepData.estimatedMinutes,
      startedAt: currentExecution?.startedAt ?? null,
    };
  }

  // 完了済みステップ取得
  const completedExecutions = await db
    .select({
      stepId: workflowExecutions.stepId,
      completedAt: workflowExecutions.completedAt,
      durationSeconds: workflowExecutions.durationSeconds,
    })
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.assignmentId, assignment.id),
        eq(workflowExecutions.status, "completed")
      )
    );

  const previousSteps: PreviousStep[] = completedExecutions
    .map((exec) => {
      const step = steps.find((s) => s.id === exec.stepId);
      if (!step) return null;
      return {
        stepOrder: step.stepOrder,
        title: step.title,
        completedAt: exec.completedAt,
        durationSeconds: exec.durationSeconds,
      };
    })
    .filter((s): s is PreviousStep => s !== null)
    .sort((a, b) => a.stepOrder - b.stepOrder);

  const data: TaskExecutionData = {
    assignment: {
      id: assignment.id,
      workflowName: template?.name ?? "ワークフロー",
      projectName,
      status: assignment.status,
      totalSteps: steps.length,
      currentStep: assignment.currentStep,
      startedAt: assignment.startedAt,
      dueDate: assignment.dueDate,
    },
    currentTask,
    previousSteps,
  };

  return <TaskExecutionView initialData={data} />;
}
