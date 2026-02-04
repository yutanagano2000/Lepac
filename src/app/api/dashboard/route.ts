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
  });
}
