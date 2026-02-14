import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc, gt } from "drizzle-orm";
import { db } from "@/db";
import {
  workflowAssignments,
  workflowTemplates,
  workflowSteps,
  workflowExecutions,
} from "@/db/schema";
import { skipWorkflowStepSchema, validateBody } from "@/lib/validations";
import { requireOrganizationWithCsrf, getUserId } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

// ステップスキップ
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireOrganizationWithCsrf(request);
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

  const validation = await validateBody(request, skipWorkflowStepSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { reason } = validation.data;

  // 割り当て取得（自分宛てかつ組織チェック）
  const [assignment] = await db
    .select({
      id: workflowAssignments.id,
      templateId: workflowAssignments.templateId,
      status: workflowAssignments.status,
      currentStep: workflowAssignments.currentStep,
    })
    .from(workflowAssignments)
    .innerJoin(workflowTemplates, eq(workflowAssignments.templateId, workflowTemplates.id))
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

  if (assignment.status !== "in_progress") {
    return NextResponse.json({ error: "このワークフローは進行中ではありません" }, { status: 400 });
  }

  // 現在のステップを取得
  const [currentStep] = await db
    .select()
    .from(workflowSteps)
    .where(
      and(
        eq(workflowSteps.templateId, assignment.templateId),
        eq(workflowSteps.stepOrder, assignment.currentStep)
      )
    );

  if (!currentStep) {
    return NextResponse.json({ error: "現在のステップが見つかりません" }, { status: 500 });
  }

  const now = new Date().toISOString();

  try {
    // 次のステップを確認
    const [nextStep] = await db
      .select()
      .from(workflowSteps)
      .where(
        and(
          eq(workflowSteps.templateId, assignment.templateId),
          gt(workflowSteps.stepOrder, assignment.currentStep)
        )
      )
      .orderBy(asc(workflowSteps.stepOrder))
      .limit(1);

    // トランザクションで一括更新
    await db.transaction(async (tx) => {
      // 現在のステップをスキップ
      await tx
        .update(workflowExecutions)
        .set({
          status: "skipped",
          completedAt: now,
          notes: reason?.trim() ?? "スキップ",
        })
        .where(
          and(
            eq(workflowExecutions.assignmentId, assignmentId),
            eq(workflowExecutions.stepId, currentStep.id)
          )
        );

      if (nextStep) {
        // 次のステップがある場合
        await tx
          .update(workflowAssignments)
          .set({ currentStep: nextStep.stepOrder })
          .where(eq(workflowAssignments.id, assignmentId));

        // 次のステップの実行記録を開始
        await tx
          .update(workflowExecutions)
          .set({
            status: "in_progress",
            startedAt: now,
          })
          .where(
            and(
              eq(workflowExecutions.assignmentId, assignmentId),
              eq(workflowExecutions.stepId, nextStep.id)
            )
          );
      } else {
        // 最後のステップだった場合、ワークフロー完了
        await tx
          .update(workflowAssignments)
          .set({
            status: "completed",
            completedAt: now,
          })
          .where(eq(workflowAssignments.id, assignmentId));
      }
    });

    if (nextStep) {
      return NextResponse.json({
        success: true,
        skipped: true,
        completed: false,
        nextStep: {
          stepId: nextStep.id,
          stepOrder: nextStep.stepOrder,
          title: nextStep.title,
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        skipped: true,
        completed: true,
        completedAt: now,
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to skip step:", error);
    }
    return NextResponse.json({ error: "ステップのスキップに失敗しました" }, { status: 500 });
  }
}
