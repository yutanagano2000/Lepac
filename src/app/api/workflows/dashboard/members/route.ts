import { NextResponse } from "next/server";
import { eq, and, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  workflowAssignments,
  workflowTemplates,
  workflowSteps,
  workflowExecutions,
  users,
} from "@/db/schema";
import { requireOrganization } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// メンバー状況一覧
export async function GET() {
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  // 組織内のユーザー一覧を取得
  const orgUsers = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
    })
    .from(users)
    .where(eq(users.organizationId, organizationId));

  if (orgUsers.length === 0) {
    return NextResponse.json([]);
  }

  // 組織内のテンプレートIDを取得
  const orgTemplates = await db
    .select({ id: workflowTemplates.id })
    .from(workflowTemplates)
    .where(eq(workflowTemplates.organizationId, organizationId));

  const templateIds = orgTemplates.map((t) => t.id);

  // テンプレートがない場合は空の統計を返す
  if (templateIds.length === 0) {
    return NextResponse.json({
      members: orgUsers.map((user) => ({
        userId: user.id,
        userName: user.name ?? user.username ?? "名前なし",
        currentTask: null,
        todayStats: {
          completedWorkflows: 0,
          totalMinutes: 0,
          avgMinutesPerWorkflow: 0,
        },
      })),
    });
  }

  const userIds = orgUsers.map((u) => u.id);

  // 今日の開始時刻
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartStr = todayStart.toISOString();

  // 一括クエリ: 進行中の割り当てを全ユーザー分取得
  const inProgressAssignments = await db
    .select({
      userId: workflowAssignments.userId,
      assignmentId: workflowAssignments.id,
      templateId: workflowAssignments.templateId,
      currentStep: workflowAssignments.currentStep,
      startedAt: workflowAssignments.startedAt,
      templateName: workflowTemplates.name,
    })
    .from(workflowAssignments)
    .innerJoin(workflowTemplates, eq(workflowAssignments.templateId, workflowTemplates.id))
    .where(
      and(
        inArray(workflowAssignments.userId, userIds),
        eq(workflowAssignments.status, "in_progress"),
        inArray(workflowAssignments.templateId, templateIds)
      )
    );

  // 一括クエリ: テンプレート毎のステップ数
  const stepCounts = await db
    .select({
      templateId: workflowSteps.templateId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(workflowSteps)
    .where(inArray(workflowSteps.templateId, templateIds))
    .groupBy(workflowSteps.templateId);

  const stepCountMap = new Map(stepCounts.map((s) => [s.templateId, s.count]));

  // 一括クエリ: 全ステップ情報を取得（必要なものだけ）
  const relevantTemplateIds = [...new Set(inProgressAssignments.map((a) => a.templateId))];
  const allSteps =
    relevantTemplateIds.length > 0
      ? await db
          .select({
            id: workflowSteps.id,
            templateId: workflowSteps.templateId,
            stepOrder: workflowSteps.stepOrder,
            title: workflowSteps.title,
            estimatedMinutes: workflowSteps.estimatedMinutes,
          })
          .from(workflowSteps)
          .where(inArray(workflowSteps.templateId, relevantTemplateIds))
      : [];

  // 一括クエリ: 実行記録を取得
  const assignmentIds = inProgressAssignments.map((a) => a.assignmentId);
  const allExecutions =
    assignmentIds.length > 0
      ? await db
          .select({
            assignmentId: workflowExecutions.assignmentId,
            stepId: workflowExecutions.stepId,
            startedAt: workflowExecutions.startedAt,
          })
          .from(workflowExecutions)
          .where(inArray(workflowExecutions.assignmentId, assignmentIds))
      : [];

  // 一括クエリ: 今日の完了統計
  const completedToday = await db
    .select({
      userId: workflowAssignments.userId,
      id: workflowAssignments.id,
      startedAt: workflowAssignments.startedAt,
      completedAt: workflowAssignments.completedAt,
    })
    .from(workflowAssignments)
    .where(
      and(
        inArray(workflowAssignments.userId, userIds),
        eq(workflowAssignments.status, "completed"),
        gte(workflowAssignments.completedAt, todayStartStr),
        inArray(workflowAssignments.templateId, templateIds)
      )
    );

  // ルックアップマップを構築
  const inProgressByUser = new Map<number, (typeof inProgressAssignments)[0]>();
  for (const assignment of inProgressAssignments) {
    // 最初の進行中タスクのみ保持
    if (!inProgressByUser.has(assignment.userId)) {
      inProgressByUser.set(assignment.userId, assignment);
    }
  }

  const stepsByTemplate = new Map<number, (typeof allSteps)[0][]>();
  for (const step of allSteps) {
    const existing = stepsByTemplate.get(step.templateId) ?? [];
    existing.push(step);
    stepsByTemplate.set(step.templateId, existing);
  }

  const executionsByAssignment = new Map<number, (typeof allExecutions)[0][]>();
  for (const exec of allExecutions) {
    const existing = executionsByAssignment.get(exec.assignmentId) ?? [];
    existing.push(exec);
    executionsByAssignment.set(exec.assignmentId, existing);
  }

  const completedByUser = new Map<number, (typeof completedToday)[0][]>();
  for (const completed of completedToday) {
    const existing = completedByUser.get(completed.userId) ?? [];
    existing.push(completed);
    completedByUser.set(completed.userId, existing);
  }

  // 各ユーザーの状況を構築（同期的に処理、DBクエリなし）
  const membersWithStats = orgUsers.map((user) => {
    // 進行中のタスク
    let currentTask = null;
    const inProgressAssignment = inProgressByUser.get(user.id);

    if (inProgressAssignment) {
      const steps = stepsByTemplate.get(inProgressAssignment.templateId) ?? [];
      const currentStepData = steps.find(
        (s) => s.stepOrder === inProgressAssignment.currentStep
      );
      const executions = executionsByAssignment.get(inProgressAssignment.assignmentId) ?? [];
      const currentExecution = executions.find(
        (e) => currentStepData && e.stepId === currentStepData.id
      );

      const elapsedMinutes = currentExecution?.startedAt
        ? Math.floor((Date.now() - new Date(currentExecution.startedAt).getTime()) / 60000)
        : 0;

      const isOvertime =
        currentStepData?.estimatedMinutes != null &&
        elapsedMinutes > currentStepData.estimatedMinutes;

      currentTask = {
        assignmentId: inProgressAssignment.assignmentId,
        workflowName: inProgressAssignment.templateName,
        currentStep: inProgressAssignment.currentStep,
        totalSteps: stepCountMap.get(inProgressAssignment.templateId) ?? 0,
        stepTitle: currentStepData?.title ?? "",
        elapsedMinutes,
        isOvertime,
      };
    }

    // 今日の完了統計
    const userCompleted = completedByUser.get(user.id) ?? [];
    const totalMinutes = userCompleted.reduce((sum, a) => {
      if (a.startedAt && a.completedAt) {
        const duration =
          (new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime()) / 60000;
        return sum + duration;
      }
      return sum;
    }, 0);

    const todayStats = {
      completedWorkflows: userCompleted.length,
      totalMinutes: Math.round(totalMinutes),
      avgMinutesPerWorkflow:
        userCompleted.length > 0 ? Math.round(totalMinutes / userCompleted.length) : 0,
    };

    return {
      userId: user.id,
      userName: user.name ?? user.username ?? "名前なし",
      currentTask,
      todayStats,
    };
  });

  return NextResponse.json({ members: membersWithStats });
}
