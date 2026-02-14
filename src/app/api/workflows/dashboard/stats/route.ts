import { NextResponse } from "next/server";
import { eq, and, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { workflowAssignments, workflowTemplates } from "@/db/schema";
import { requireOrganization } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// 統計情報
export async function GET() {
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  // 組織内のテンプレートIDを取得
  const orgTemplates = await db
    .select({ id: workflowTemplates.id, name: workflowTemplates.name })
    .from(workflowTemplates)
    .where(eq(workflowTemplates.organizationId, organizationId));

  const templateIds = orgTemplates.map((t) => t.id);

  if (templateIds.length === 0) {
    return NextResponse.json({
      today: { completed: 0, inProgress: 0, pending: 0 },
      thisWeek: { completed: 0, avgMinutes: 0 },
      byTemplate: [],
    });
  }

  // 今日の開始時刻
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartStr = todayStart.toISOString();

  // 今週の開始時刻（月曜日）
  const weekStart = new Date();
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString();

  // 今日のステータス別カウント
  const todayAssignments = await db
    .select({
      status: workflowAssignments.status,
    })
    .from(workflowAssignments)
    .where(inArray(workflowAssignments.templateId, templateIds));

  const todayStats = {
    completed: todayAssignments.filter((a) => a.status === "completed").length,
    inProgress: todayAssignments.filter((a) => a.status === "in_progress").length,
    pending: todayAssignments.filter((a) => a.status === "pending").length,
  };

  // 今週の完了ワークフロー
  const weekCompleted = await db
    .select({
      id: workflowAssignments.id,
      startedAt: workflowAssignments.startedAt,
      completedAt: workflowAssignments.completedAt,
    })
    .from(workflowAssignments)
    .where(
      and(
        inArray(workflowAssignments.templateId, templateIds),
        eq(workflowAssignments.status, "completed"),
        gte(workflowAssignments.completedAt, weekStartStr)
      )
    );

  const weekTotalMinutes = weekCompleted.reduce((sum, a) => {
    if (a.startedAt && a.completedAt) {
      const duration =
        (new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime()) / 60000;
      return sum + duration;
    }
    return sum;
  }, 0);

  const weekStats = {
    completed: weekCompleted.length,
    avgMinutes: weekCompleted.length > 0 ? Math.round(weekTotalMinutes / weekCompleted.length) : 0,
  };

  // テンプレート別統計
  const byTemplate = await Promise.all(
    orgTemplates.map(async (template) => {
      const assignments = await db
        .select({
          status: workflowAssignments.status,
          startedAt: workflowAssignments.startedAt,
          completedAt: workflowAssignments.completedAt,
        })
        .from(workflowAssignments)
        .where(eq(workflowAssignments.templateId, template.id));

      const completed = assignments.filter((a) => a.status === "completed");
      const totalMinutes = completed.reduce((sum, a) => {
        if (a.startedAt && a.completedAt) {
          const duration =
            (new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime()) / 60000;
          return sum + duration;
        }
        return sum;
      }, 0);

      return {
        templateId: template.id,
        templateName: template.name,
        totalAssignments: assignments.length,
        completedCount: completed.length,
        inProgressCount: assignments.filter((a) => a.status === "in_progress").length,
        pendingCount: assignments.filter((a) => a.status === "pending").length,
        avgMinutes: completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0,
      };
    })
  );

  return NextResponse.json({
    today: todayStats,
    thisWeek: weekStats,
    byTemplate,
  });
}
