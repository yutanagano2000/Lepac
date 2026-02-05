import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress, todos } from "@/db/schema";

export const dynamic = "force-dynamic";

// タイムラインと同じフェーズ定義
const PHASES = [
  "合意書", "案件提出", "現調", "土地売買契約", "土地契約",
  "法令申請", "法令許可", "電力申請", "電力回答", "SS依頼",
  "SS実施", "土地決済", "発注", "着工", "連系", "完工"
];

// 完工月から月初の日付を取得するヘルパー
function parseCompletionMonth(completionMonth: string | null): Date | null {
  if (!completionMonth) return null;
  // "YYYY-MM" または "YYYY/MM" または "YYYY年MM月" などの形式に対応
  const match = completionMonth.match(/(\d{4})[年\/\-]?(\d{1,2})/);
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]) - 1; // 0-indexed
    return new Date(year, month, 1);
  }
  return null;
}

export async function GET() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const today = now.toISOString().split("T")[0];
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // 全データ取得
  const allProjects = await db.select().from(projects);
  const allProgress = await db.select().from(progress);
  const allTodos = await db.select().from(todos);

  // 1. 期日超過TODO（未完了で期日が今日より前）
  const overdueTodos = allTodos.filter((t) => {
    if (t.completedAt) return false;
    return t.dueDate < today;
  });

  // 2. 今日期日のTODO
  const todayTodos = allTodos.filter((t) => {
    if (t.completedAt) return false;
    return t.dueDate === today;
  });

  // 3. 今週期日のTODO（今日より後、1週間以内）
  const thisWeekTodos = allTodos.filter((t) => {
    if (t.completedAt) return false;
    return t.dueDate > today && t.dueDate <= weekFromNow;
  });

  // 4. 案件アラート（タイムラインと同じロジック）
  // 各フェーズで、完了していない場合:
  // - 期日未設定（progressがない、またはcreatedAtがない） → アラート
  // - 期日超過（未完了でcreatedAt < 今日） → アラート
  const projectsWithAlerts: { id: number; managementNumber: string; alertCount: number }[] = [];
  let totalAlertCount = 0;

  for (const project of allProjects) {
    const projectProgress = allProgress.filter((p) => p.projectId === project.id);
    let alertCount = 0;

    for (const phaseTitle of PHASES) {
      const phaseProgress = projectProgress.find((p) => p.title === phaseTitle);

      // 完了済みはスキップ（status === "completed" かつ completedAt がある場合のみ）
      if (phaseProgress?.status === "completed" && phaseProgress?.completedAt) continue;

      // 期日を取得（タイムラインと同じロジック）
      let phaseDate: Date | null = null;
      if (phaseProgress?.createdAt) {
        phaseDate = new Date(phaseProgress.createdAt);
      }

      // 期日未設定 → アラート
      if (!phaseDate) {
        alertCount++;
        continue;
      }

      // 期日超過（未完了でcreatedAt < 今日） → アラート
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

  // 5. 進行中案件（完工済みでない案件）
  const activeProjects = allProjects.filter((p) => {
    const projectProgress = allProgress.filter((prog) => prog.projectId === p.id);
    const completionProgress = projectProgress.find((prog) => prog.title === "完工");
    return !completionProgress || completionProgress.status !== "completed";
  });

  // 6. 最近追加された案件（idでソート、上位5件）
  const recentProjects = [...allProjects]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  // 7. 完工アラート（完工2ヶ月前:赤、3ヶ月前:黄）
  const twoMonthsFromNow = new Date(now);
  twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
  const threeMonthsFromNow = new Date(now);
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

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
    const projectProgress = allProgress.filter((p) => p.projectId === project.id);
    const completionProgress = projectProgress.find((p) => p.title === "完工");
    if (completionProgress?.status === "completed") continue;

    // 月の差分を計算
    const monthsDiff = (completionDate.getFullYear() - now.getFullYear()) * 12 +
                       (completionDate.getMonth() - now.getMonth());

    if (monthsDiff <= 2) {
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

  // 緊急度でソート（赤が先、残り月数が少ない順）
  completionAlerts.sort((a, b) => {
    if (a.level !== b.level) return a.level === "red" ? -1 : 1;
    return a.monthsRemaining - b.monthsRemaining;
  });

  // 8. 現調未実施アラート（完工が近いのに現調が終わっていない）
  const siteInvestigationAlerts: {
    id: number;
    managementNumber: string;
    client: string;
    completionMonth: string;
    level: "red" | "yellow";
  }[] = [];

  for (const project of allProjects) {
    // 現調が実施済みかチェック
    const hasSiteInvestigation = project.siteInvestigation &&
      project.siteInvestigation.trim() !== "" &&
      project.siteInvestigation !== "未実施" &&
      project.siteInvestigation !== "未";

    if (hasSiteInvestigation) continue;

    // 既に完工済みの場合はスキップ
    const projectProgress = allProgress.filter((p) => p.projectId === project.id);
    const completionProgress = projectProgress.find((p) => p.title === "完工");
    if (completionProgress?.status === "completed") continue;

    // 完工月を取得
    const completionDate = parseCompletionMonth(project.completionMonth);
    if (!completionDate) continue;

    // 月の差分を計算
    const monthsDiff = (completionDate.getFullYear() - now.getFullYear()) * 12 +
                       (completionDate.getMonth() - now.getMonth());

    // 3ヶ月以内に完工予定で現調未実施
    if (monthsDiff <= 2) {
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

  // 緊急度でソート
  siteInvestigationAlerts.sort((a, b) => {
    if (a.level !== b.level) return a.level === "red" ? -1 : 1;
    return 0;
  });

  // TODO詳細を案件情報付きで取得
  const enrichTodos = (todoList: typeof allTodos) => {
    return todoList.slice(0, 5).map((t) => {
      const project = allProjects.find((p) => p.id === t.projectId);
      return {
        id: t.id,
        content: t.content,
        dueDate: t.dueDate,
        projectId: t.projectId,
        managementNumber: project?.managementNumber || "不明",
      };
    });
  };

  return NextResponse.json({
    overdueTodos: {
      count: overdueTodos.length,
      items: enrichTodos(overdueTodos),
    },
    todayTodos: {
      count: todayTodos.length,
      items: enrichTodos(todayTodos),
    },
    thisWeekTodos: {
      count: thisWeekTodos.length,
      items: enrichTodos(thisWeekTodos),
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
    // 完工アラート（2ヶ月前:赤、3ヶ月前:黄）
    completionAlerts: {
      redCount: completionAlerts.filter((a) => a.level === "red").length,
      yellowCount: completionAlerts.filter((a) => a.level === "yellow").length,
      items: completionAlerts.slice(0, 5),
    },
    // 現調未実施アラート
    siteInvestigationAlerts: {
      redCount: siteInvestigationAlerts.filter((a) => a.level === "red").length,
      yellowCount: siteInvestigationAlerts.filter((a) => a.level === "yellow").length,
      items: siteInvestigationAlerts.slice(0, 5),
    },
  });
}
