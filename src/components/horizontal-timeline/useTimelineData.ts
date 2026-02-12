import { useMemo } from "react";
import {
  WORKFLOW_PHASES,
  calculateWorkflowTimelineFromCompletion,
  type WorkflowSubPhase,
  type WorkflowTimelinePhase,
} from "@/lib/timeline";
import type { Progress } from "@/db/schema";
import type { HorizontalPhaseData, PhaseOverride, PhaseOverrides, PhaseStatus, ProjectPhaseOverrides } from "./types";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** JSON文字列をProjectPhaseOverrides互換形式にパース（後方互換性あり） */
function parseOverridesJson(json: string | null | undefined): {
  phases: PhaseOverrides;
  taskAssignments: Record<string, string>;
} {
  if (!json) return { phases: {}, taskAssignments: {} };
  try {
    const parsed = JSON.parse(json);
    // 新形式: { phases: {...}, taskAssignments: {...} }
    if (parsed.phases && typeof parsed.phases === "object") {
      return {
        phases: parsed.phases as PhaseOverrides,
        taskAssignments: (parsed.taskAssignments ?? {}) as Record<string, string>,
      };
    }
    // 旧形式: Record<string, PhaseOverride> (直接のフラットマップ)
    return { phases: parsed as PhaseOverrides, taskAssignments: {} };
  } catch {
    return { phases: {}, taskAssignments: {} };
  }
}

/** サブフェーズをoverride順序・スキップ・フェーズ間移動に基づいて処理 */
function processSubPhases(
  phaseKey: string,
  subs: readonly WorkflowSubPhase[] | undefined,
  override: PhaseOverride | undefined,
  taskAssignments: Record<string, string>,
  allSubPhasesMap: Map<string, WorkflowSubPhase>
): WorkflowSubPhase[] | undefined {
  if (!subs && Object.keys(taskAssignments).length === 0) return undefined;

  const baseSubs = subs ? [...subs] : [];
  const skipped = new Set(override?.skippedSubPhases ?? []);

  // フェーズ間移動: このフェーズに移動されたサブフェーズを追加
  for (const [subKey, targetPhase] of Object.entries(taskAssignments)) {
    if (targetPhase === phaseKey && !baseSubs.some((s) => s.key === subKey)) {
      const moved = allSubPhasesMap.get(subKey);
      if (moved) baseSubs.push(moved);
    }
  }

  // このフェーズから移動されたサブフェーズを除外
  const filtered = baseSubs.filter((sp) => {
    if (skipped.has(sp.key)) return false;
    const assignment = taskAssignments[sp.key];
    if (assignment && assignment !== phaseKey) return false;
    return true;
  });

  // カスタム順序が指定されている場合はその順番に並べ替え
  if (override?.subPhaseOrder && override.subPhaseOrder.length > 0) {
    const order = override.subPhaseOrder;
    const ordered: WorkflowSubPhase[] = [];
    for (const key of order) {
      const found = filtered.find((sp) => sp.key === key);
      if (found) ordered.push(found);
    }
    // 順序に含まれないものは末尾に追加
    for (const sp of filtered) {
      if (!order.includes(sp.key)) ordered.push(sp);
    }
    return ordered;
  }

  return filtered;
}

export function useTimelineData(
  completionMonth: string | null | undefined,
  progressList: Progress[],
  phaseOverridesJson?: string | null
) {
  const now = useMemo(() => new Date(), []);

  const completedTitles = useMemo(
    () => new Set(progressList.filter((p) => p.status === "completed").map((p) => p.title)),
    [progressList]
  );

  // フェーズ上書きデータのパース（新旧形式対応）
  const { phases: phaseOverrides, taskAssignments } = useMemo(
    () => parseOverridesJson(phaseOverridesJson),
    [phaseOverridesJson]
  );

  // 全サブフェーズのマップ（フェーズ間移動時の参照用）
  const allSubPhasesMap = useMemo(() => {
    const map = new Map<string, WorkflowSubPhase>();
    for (const wp of WORKFLOW_PHASES) {
      if ("subPhases" in wp && wp.subPhases) {
        for (const sp of wp.subPhases) {
          map.set(sp.key, sp as WorkflowSubPhase);
        }
      }
    }
    return map;
  }, []);

  // 完工月からタイムライン日付を算出（overrides渡し対応）
  const calculatedTimeline = useMemo(() => {
    if (!completionMonth) return null;
    const timeline = calculateWorkflowTimelineFromCompletion(completionMonth, phaseOverrides);
    if (timeline.length === 0) return null;
    const map = new Map<string, WorkflowTimelinePhase>();
    for (const phase of timeline) {
      map.set(phase.key, phase);
    }
    return map;
  }, [completionMonth, phaseOverrides]);

  // 各フェーズのデータを算出
  const phases = useMemo<HorizontalPhaseData[]>(() => {
    return WORKFLOW_PHASES.map((wp) => {
      const calculated = calculatedTimeline?.get(wp.key);
      const override = phaseOverrides[wp.key];

      // サブフェーズ（override/taskAssignments適用）
      const rawSubs = calculated?.subPhases ?? ("subPhases" in wp ? (wp.subPhases as readonly WorkflowSubPhase[]) : undefined);
      const subs = processSubPhases(wp.key, rawSubs, override, taskAssignments, allSubPhasesMap);

      let totalSubs = 0;
      let completedSubs = 0;

      if (subs && subs.length > 0) {
        subs.forEach((sub) => {
          totalSubs++;
          if (completedTitles.has(sub.title)) completedSubs++;
        });
      } else {
        totalSubs = 1;
        if (completedTitles.has(wp.title)) completedSubs = 1;
      }

      let status: PhaseStatus = "pending";
      if (completedSubs > 0 && completedSubs >= totalSubs) status = "completed";
      else if (completedSubs > 0) status = "in_progress";

      // 日付の決定（上書き優先）
      let startDate = calculated?.startDate;
      let endDate = calculated?.endDate;

      if (override?.startDate) {
        startDate = new Date(override.startDate);
      }
      if (override?.endDate) {
        endDate = new Date(override.endDate);
      }

      // アラート判定
      const isOverdue = status !== "completed" && endDate ? endDate.getTime() < now.getTime() : false;
      const isUpcoming = status !== "completed" && !isOverdue && endDate
        ? (endDate.getTime() - now.getTime()) < SEVEN_DAYS_MS && endDate.getTime() >= now.getTime()
        : false;

      return {
        key: wp.key,
        title: wp.title,
        phase: wp.phase,
        status,
        totalSubs,
        completedSubs,
        subPhases: subs,
        startDate,
        endDate,
        isOverdue,
        isUpcoming,
      };
    });
  }, [completedTitles, calculatedTimeline, phaseOverrides, taskAssignments, allSubPhasesMap, now]);

  // 全体進捗率
  const overallProgress = useMemo(() => {
    const totalSubs = phases.reduce((acc, p) => acc + p.totalSubs, 0);
    const completedSubs = phases.reduce((acc, p) => acc + p.completedSubs, 0);
    return totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
  }, [phases]);

  // 現在のフェーズ
  const currentPhase = useMemo(() => {
    return phases.find((p) => p.status === "in_progress") || phases.find((p) => p.status === "pending");
  }, [phases]);

  // 遅延中フェーズ数
  const overdueCount = useMemo(() => phases.filter((p) => p.isOverdue).length, [phases]);

  // 1週間以内に期日が来るフェーズ数
  const upcomingCount = useMemo(() => phases.filter((p) => p.isUpcoming).length, [phases]);

  // 次に行うべきこと
  const nextAction = useMemo(() => {
    for (const phase of phases) {
      if (phase.status === "completed") continue;
      if (phase.subPhases && phase.subPhases.length > 0) {
        for (const sub of phase.subPhases) {
          if (!completedTitles.has(sub.title)) {
            return { title: sub.title, phase: phase.phase.split(" ")[1], phaseTitle: phase.title };
          }
        }
      } else if (!completedTitles.has(phase.title)) {
        return { title: phase.title, phase: phase.phase.split(" ")[1], phaseTitle: phase.title };
      }
    }
    return null;
  }, [phases, completedTitles]);

  return {
    phases,
    overallProgress,
    currentPhase,
    overdueCount,
    upcomingCount,
    nextAction,
    completedTitles,
  };
}
