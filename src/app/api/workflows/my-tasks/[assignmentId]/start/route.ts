import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  workflowAssignments,
  workflowTemplates,
  workflowSteps,
  workflowExecutions,
} from "@/db/schema";
import { requireOrganizationWithCsrf, getUserId } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ assignmentId: string }>;
}

// ワークフロー開始
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

  // 割り当て取得（自分宛てかつ組織チェック）
  const [assignment] = await db
    .select({
      id: workflowAssignments.id,
      templateId: workflowAssignments.templateId,
      status: workflowAssignments.status,
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

  if (assignment.status !== "pending") {
    return NextResponse.json({ error: "このワークフローは既に開始されています" }, { status: 400 });
  }

  const now = new Date().toISOString();

  try {
    // 最初のステップを取得
    const [firstStep] = await db
      .select({ id: workflowSteps.id })
      .from(workflowSteps)
      .where(eq(workflowSteps.templateId, assignment.templateId))
      .orderBy(asc(workflowSteps.stepOrder))
      .limit(1);

    // トランザクションで一括更新
    await db.transaction(async (tx) => {
      // 割り当てを開始状態に更新
      await tx
        .update(workflowAssignments)
        .set({
          status: "in_progress",
          startedAt: now,
        })
        .where(eq(workflowAssignments.id, assignmentId));

      // 最初のステップの実行記録を開始状態に更新
      if (firstStep) {
        await tx
          .update(workflowExecutions)
          .set({
            status: "in_progress",
            startedAt: now,
          })
          .where(
            and(
              eq(workflowExecutions.assignmentId, assignmentId),
              eq(workflowExecutions.stepId, firstStep.id)
            )
          );
      }
    });

    return NextResponse.json({ success: true, startedAt: now });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to start workflow:", error);
    }
    return NextResponse.json({ error: "ワークフローの開始に失敗しました" }, { status: 500 });
  }
}
