import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress, todos } from "@/db/schema";
import { eq, lt, and, isNull, lte, gt, desc, sql } from "drizzle-orm";
import { createErrorResponse } from "@/lib/api-error";
import { requireOrganization } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// WORKFLOW_PHASESのサブフェーズタイトル（進捗アラート判定用）
const PROGRESS_PHASE_TITLES = [
  "案件取得", "初期撮影",
  "現場案内図作成", "法令チェック", "ハザードマップ確認", "ラフ図面作成",
  "現調（不足分の写真撮影）",
  "提出可否チェック",
  "図面修正", "電力シミュレーション", "近隣挨拶・伐採範囲の許可取得", "土地契約", "地目変更",
  "DD", "電力申請", "法令申請",
  "法令回答", "電力回答",
  "本設計（再シミュレーション実施）",
  "地盤調査依頼", "決済（名義変更）",
  "工事着工～完了",
];

// 完工月から月初の日付を取得するヘルパー
function parseCompletionMonth(completionMonth: string | null): Date | null {
  if (!completionMonth) return null;
  const match = completionMonth.match(/(\d{4})[年\/\-]?(\d{1,2})/);
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    // 不正月（0, 13など）を拒否
    if (month < 1 || month > 12) return null;
    return new Date(year, month - 1, 1);
  }
  return null;
}

export async function GET() {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    // ローカル日付文字列を生成（UTC変換による日付ズレを防止）
    const formatLocalDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const today = formatLocalDate(now);
    const weekFromNowDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekFromNow = formatLocalDate(weekFromNowDate);

    // 最適化: 並列でクエリを実行し、必要なデータのみ取得
    const [
      // 期限切れTODO（未完了で期日が今日より前）
      overdueTodosRaw,
      // 今日期日のTODO
      todayTodosRaw,
      // 今週期日のTODO
      thisWeekTodosRaw,
      // 全プロジェクト（必要なカラムのみ）
      allProjects,
      // 全進捗
      allProgress,
      // 最近のプロジェクト
      recentProjects,
    ] = await Promise.all([
      // 期限切れTODO（組織フィルタリング）
      db.select({
        id: todos.id,
        content: todos.content,
        dueDate: todos.dueDate,
        projectId: todos.projectId,
      })
        .from(todos)
        .where(and(
          eq(todos.organizationId, organizationId),
          isNull(todos.completedAt),
          lt(todos.dueDate, today)
        ))
        .limit(10),

      // 今日期日のTODO（組織フィルタリング）
      db.select({
        id: todos.id,
        content: todos.content,
        dueDate: todos.dueDate,
        projectId: todos.projectId,
      })
        .from(todos)
        .where(and(
          eq(todos.organizationId, organizationId),
          isNull(todos.completedAt),
          eq(todos.dueDate, today)
        ))
        .limit(10),

      // 今週期日のTODO（組織フィルタリング）
      db.select({
        id: todos.id,
        content: todos.content,
        dueDate: todos.dueDate,
        projectId: todos.projectId,
      })
        .from(todos)
        .where(and(
          eq(todos.organizationId, organizationId),
          isNull(todos.completedAt),
          gt(todos.dueDate, today),
          lte(todos.dueDate, weekFromNow)
        ))
        .limit(10),

      // プロジェクト（組織フィルタリング）
      db.select({
        id: projects.id,
        managementNumber: projects.managementNumber,
        client: projects.client,
        completionMonth: projects.completionMonth,
        siteInvestigation: projects.siteInvestigation,
      }).from(projects).where(eq(projects.organizationId, organizationId)),

      // 進捗（組織に属するプロジェクトのもののみ取得）
      db.select({
        id: progress.id,
        projectId: progress.projectId,
        title: progress.title,
        status: progress.status,
        createdAt: progress.createdAt,
        completedAt: progress.completedAt,
      })
        .from(progress)
        .innerJoin(projects, eq(progress.projectId, projects.id))
        .where(eq(projects.organizationId, organizationId)),

      // 最近のプロジェクト（組織フィルタリング）
      db.select({
        id: projects.id,
        managementNumber: projects.managementNumber,
        client: projects.client,
      })
        .from(projects)
        .where(eq(projects.organizationId, organizationId))
        .orderBy(desc(projects.id))
        .limit(5),
    ]);

    // TODOのカウントを並列で取得（組織フィルタリング）
    const [overdueTodosCount, todayTodosCount, thisWeekTodosCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(todos)
        .where(and(
          eq(todos.organizationId, organizationId),
          isNull(todos.completedAt),
          lt(todos.dueDate, today)
        )),
      db.select({ count: sql<number>`count(*)` })
        .from(todos)
        .where(and(
          eq(todos.organizationId, organizationId),
          isNull(todos.completedAt),
          eq(todos.dueDate, today)
        )),
      db.select({ count: sql<number>`count(*)` })
        .from(todos)
        .where(and(
          eq(todos.organizationId, organizationId),
          isNull(todos.completedAt),
          gt(todos.dueDate, today),
          lte(todos.dueDate, weekFromNow)
        )),
    ]);

    // プロジェクトIDをキーにしたMapを作成（O(n)でルックアップ可能に）
    const projectMap = new Map(allProjects.map((p) => [p.id, p]));
    const projectIds = new Set(allProjects.map((p) => p.id));

    // 進捗をプロジェクトIDでグループ化（組織に属するプロジェクトのもののみ）
    const progressByProject = new Map<number, typeof allProgress>();
    for (const prog of allProgress) {
      if (!projectIds.has(prog.projectId)) continue; // 組織外のプロジェクトはスキップ
      const existing = progressByProject.get(prog.projectId) || [];
      existing.push(prog);
      progressByProject.set(prog.projectId, existing);
    }

    // 4. 案件アラート（最適化版 - Mapを使用）
    const projectsWithAlerts: { id: number; managementNumber: string; alertCount: number }[] = [];
    let totalAlertCount = 0;

    for (const project of allProjects) {
      const projectProgress = progressByProject.get(project.id) || [];
      let alertCount = 0;

      // 進捗をタイトルでインデックス化
      const progressByTitle = new Map(projectProgress.map((p) => [p.title, p]));

      for (const phaseTitle of PROGRESS_PHASE_TITLES) {
        const phaseProgress = progressByTitle.get(phaseTitle);

        // statusが"completed"なら完了とみなす（completedAtが欠落していても対応）
        if (phaseProgress?.status === "completed") continue;

        let phaseDate: Date | null = null;
        if (phaseProgress?.createdAt) {
          // UTC解釈を避けるためローカル日付としてパース
          // ISO形式（YYYY-MM-DDTHH:mm:ss）の場合は日付部分のみ抽出
          const dateStr = phaseProgress.createdAt.split("T")[0];
          const parts = dateStr.split("-");
          if (parts.length === 3) {
            const [y, m, d] = parts.map(Number);
            // 数値が有効か確認（Invalid Date防止）
            if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
              phaseDate = new Date(y, m - 1, d);
            }
          }
        }

        if (!phaseDate) {
          alertCount++;
          continue;
        }

        phaseDate.setHours(0, 0, 0, 0);
        if (phaseDate < now) {
          alertCount++;
        }
      }

      if (alertCount > 0) {
        projectsWithAlerts.push({
          id: project.id,
          managementNumber: project.managementNumber,
          alertCount,
        });
        totalAlertCount += alertCount;
      }
    }

    // 5. 進行中案件（最適化版）
    const activeProjects = allProjects.filter((p) => {
      const projectProgress = progressByProject.get(p.id) || [];
      const completionProgress = projectProgress.find((prog) => prog.title === "工事着工～完了");
      return !completionProgress || completionProgress.status !== "completed";
    });

    // 7. 完工アラート（最適化版 - progressByProjectを使用）
    const completionAlerts: {
      id: number;
      managementNumber: string;
      client: string;
      completionMonth: string;
      level: "red" | "yellow";
      monthsRemaining: number;
    }[] = [];

    for (const project of allProjects) {
      const completionDate = parseCompletionMonth(project.completionMonth);
      if (!completionDate) continue;

      // 既に完工済みの場合はスキップ
      const projectProgress = progressByProject.get(project.id) || [];
      const completionProgress = projectProgress.find((p) => p.title === "完工");
      if (completionProgress?.status === "completed") continue;

      const monthsDiff = (completionDate.getFullYear() - now.getFullYear()) * 12 +
                         (completionDate.getMonth() - now.getMonth());

      // 過去の完工月（monthsDiff < 0）は期限切れとして赤アラート
      // 0-2ヶ月以内は赤、3ヶ月以内は黄色
      if (monthsDiff < 0) {
        completionAlerts.push({
          id: project.id,
          managementNumber: project.managementNumber,
          client: project.client || "",
          completionMonth: project.completionMonth || "",
          level: "red",
          monthsRemaining: monthsDiff, // 負の値で期限切れを示す
        });
      } else if (monthsDiff <= 2) {
        completionAlerts.push({
          id: project.id,
          managementNumber: project.managementNumber,
          client: project.client || "",
          completionMonth: project.completionMonth || "",
          level: "red",
          monthsRemaining: monthsDiff,
        });
      } else if (monthsDiff <= 3) {
        completionAlerts.push({
          id: project.id,
          managementNumber: project.managementNumber,
          client: project.client || "",
          completionMonth: project.completionMonth || "",
          level: "yellow",
          monthsRemaining: monthsDiff,
        });
      }
    }

    completionAlerts.sort((a, b) => {
      if (a.level !== b.level) return a.level === "red" ? -1 : 1;
      return a.monthsRemaining - b.monthsRemaining;
    });

    // 8. 現調未実施アラート（最適化版）
    const siteInvestigationAlerts: {
      id: number;
      managementNumber: string;
      client: string;
      completionMonth: string;
      level: "red" | "yellow";
    }[] = [];

    for (const project of allProjects) {
      const hasSiteInvestigation = project.siteInvestigation &&
        project.siteInvestigation.trim() !== "" &&
        project.siteInvestigation !== "未実施" &&
        project.siteInvestigation !== "未";

      if (hasSiteInvestigation) continue;

      const projectProgress = progressByProject.get(project.id) || [];
      const completionProgress = projectProgress.find((p) => p.title === "完工");
      if (completionProgress?.status === "completed") continue;

      const completionDate = parseCompletionMonth(project.completionMonth);
      if (!completionDate) continue;

      const monthsDiff = (completionDate.getFullYear() - now.getFullYear()) * 12 +
                         (completionDate.getMonth() - now.getMonth());

      // 過去の完工月（monthsDiff < 0）は期限切れとして赤アラート
      if (monthsDiff < 0) {
        siteInvestigationAlerts.push({
          id: project.id,
          managementNumber: project.managementNumber,
          client: project.client || "",
          completionMonth: project.completionMonth || "",
          level: "red",
        });
      } else if (monthsDiff <= 2) {
        siteInvestigationAlerts.push({
          id: project.id,
          managementNumber: project.managementNumber,
          client: project.client || "",
          completionMonth: project.completionMonth || "",
          level: "red",
        });
      } else if (monthsDiff <= 3) {
        siteInvestigationAlerts.push({
          id: project.id,
          managementNumber: project.managementNumber,
          client: project.client || "",
          completionMonth: project.completionMonth || "",
          level: "yellow",
        });
      }
    }

    siteInvestigationAlerts.sort((a, b) => {
      if (a.level !== b.level) return a.level === "red" ? -1 : 1;
      return 0;
    });

    // TODO詳細を案件情報付きで取得（最適化版 - projectMapを使用）
    const enrichTodos = (todoList: typeof overdueTodosRaw) => {
      return todoList.slice(0, 5).map((t) => {
        const project = t.projectId ? projectMap.get(t.projectId) : null;
        return {
          id: t.id,
          content: t.content,
          dueDate: t.dueDate,
          projectId: t.projectId,
          managementNumber: project?.managementNumber || "なし",
        };
      });
    };

    return NextResponse.json({
      overdueTodos: {
        count: Number(overdueTodosCount[0]?.count ?? 0),
        items: enrichTodos(overdueTodosRaw),
      },
      todayTodos: {
        count: Number(todayTodosCount[0]?.count ?? 0),
        items: enrichTodos(todayTodosRaw),
      },
      thisWeekTodos: {
        count: Number(thisWeekTodosCount[0]?.count ?? 0),
        items: enrichTodos(thisWeekTodosRaw),
      },
      projectAlerts: {
        count: projectsWithAlerts.length,
        totalAlerts: totalAlertCount,
        items: projectsWithAlerts.slice(0, 5),
      },
      activeProjects: {
        count: activeProjects.length,
        items: activeProjects.slice(0, 5).map((p) => ({
          id: p.id,
          managementNumber: p.managementNumber,
          client: p.client,
        })),
      },
      recentProjects: {
        items: recentProjects.map((p) => ({
          id: p.id,
          managementNumber: p.managementNumber,
          client: p.client,
        })),
      },
      completionAlerts: {
        redCount: completionAlerts.filter((a) => a.level === "red").length,
        yellowCount: completionAlerts.filter((a) => a.level === "yellow").length,
        items: completionAlerts.slice(0, 5),
      },
      siteInvestigationAlerts: {
        redCount: siteInvestigationAlerts.filter((a) => a.level === "red").length,
        yellowCount: siteInvestigationAlerts.filter((a) => a.level === "yellow").length,
        items: siteInvestigationAlerts.slice(0, 5),
      },
    });
  } catch (error) {
    return createErrorResponse(error, "ダッシュボードデータの取得に失敗しました");
  }
}
