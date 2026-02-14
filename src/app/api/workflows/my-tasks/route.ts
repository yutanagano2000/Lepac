import { NextResponse } from "next/server";
import { eq, and, asc, inArray, count } from "drizzle-orm";
import { db } from "@/db";
import {
  workflowAssignments,
  workflowTemplates,
  workflowSteps,
  projects,
} from "@/db/schema";
import { requireOrganization, getUserId } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// 自分に割り当てられたワークフロー一覧
export async function GET() {
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;
  const userId = getUserId(user);

  // 組織内のテンプレートIDを取得
  const orgTemplates = await db
    .select({ id: workflowTemplates.id })
    .from(workflowTemplates)
    .where(eq(workflowTemplates.organizationId, organizationId));

  const templateIds = orgTemplates.map((t) => t.id);
  if (templateIds.length === 0) {
    return NextResponse.json([]);
  }

  // テンプレートごとのステップ数を一括取得（N+1クエリ対策）
  const stepCountsByTemplate = await db
    .select({
      templateId: workflowSteps.templateId,
      totalSteps: count(workflowSteps.id),
    })
    .from(workflowSteps)
    .where(inArray(workflowSteps.templateId, templateIds))
    .groupBy(workflowSteps.templateId);

  const stepCountMap = new Map(
    stepCountsByTemplate.map((s) => [s.templateId, Number(s.totalSteps)])
  );

  // 自分に割り当てられたワークフローを取得
  const assignments = await db
    .select({
      id: workflowAssignments.id,
      templateId: workflowAssignments.templateId,
      projectId: workflowAssignments.projectId,
      status: workflowAssignments.status,
      currentStep: workflowAssignments.currentStep,
      dueDate: workflowAssignments.dueDate,
      priority: workflowAssignments.priority,
      startedAt: workflowAssignments.startedAt,
      completedAt: workflowAssignments.completedAt,
      createdAt: workflowAssignments.createdAt,
      templateName: workflowTemplates.name,
      templateCategory: workflowTemplates.category,
      projectName: projects.managementNumber,
    })
    .from(workflowAssignments)
    .innerJoin(workflowTemplates, eq(workflowAssignments.templateId, workflowTemplates.id))
    .leftJoin(projects, eq(workflowAssignments.projectId, projects.id))
    .where(
      and(
        eq(workflowAssignments.userId, userId),
        inArray(workflowAssignments.templateId, templateIds),
        // 完了・キャンセル以外
        inArray(workflowAssignments.status, ["pending", "in_progress"])
      )
    )
    .orderBy(asc(workflowAssignments.dueDate));

  // ステップ数をマージ
  const assignmentsWithStats = assignments.map((assignment) => ({
    ...assignment,
    totalSteps: stepCountMap.get(assignment.templateId) ?? 0,
  }));

  return NextResponse.json({ assignments: assignmentsWithStats });
}
