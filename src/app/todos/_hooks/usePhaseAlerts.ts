"use client";

import { useMemo, useCallback } from "react";
import type { ProjectWithProgress, PhaseStatus } from "../_types";
import { PHASES } from "../_types";

interface UsePhaseAlertsOptions {
  projects: ProjectWithProgress[];
}

interface UsePhaseAlertsReturn {
  /** 今日の日付（時刻を除去） */
  today: Date;

  /** プロジェクトのフェーズ状況を取得 */
  getPhaseStatus: (project: ProjectWithProgress, phaseTitle: string) => PhaseStatus;

  /** 現在のフェーズインデックスを取得 */
  getCurrentPhaseIndex: (project: ProjectWithProgress) => number;

  /** アラート判定: 未完了フェーズで期日未設定または期日超過 */
  isPhaseAlert: (project: ProjectWithProgress, phaseIndex: number) => boolean;

  /** 表示中の案件の全アラート数 */
  alertCount: number;
}

/**
 * フェーズアラート計算ロジックを管理するフック
 */
export function usePhaseAlerts({
  projects,
}: UsePhaseAlertsOptions): UsePhaseAlertsReturn {
  // 今日の日付（時刻を除去）
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // プロジェクトのフェーズ状況を取得
  const getPhaseStatus = useCallback(
    (project: ProjectWithProgress, phaseTitle: string): PhaseStatus => {
      const progressItem = project.progressItems.find((p) => p.title === phaseTitle);
      if (!progressItem) return { status: "pending", date: null };

      if (progressItem.status === "completed" && progressItem.completedAt) {
        return { status: "completed", date: new Date(progressItem.completedAt) };
      }
      if (progressItem.createdAt) {
        return { status: "planned", date: new Date(progressItem.createdAt) };
      }
      return { status: "pending", date: null };
    },
    []
  );

  // 現在のフェーズを特定
  const getCurrentPhaseIndex = useCallback(
    (project: ProjectWithProgress): number => {
      for (let i = PHASES.length - 1; i >= 0; i--) {
        const status = getPhaseStatus(project, PHASES[i].title);
        if (status.status === "completed") {
          return i + 1; // 完了したフェーズの次
        }
      }
      return 0;
    },
    [getPhaseStatus]
  );

  // アラート判定: 未完了フェーズで期日未設定または期日超過
  const isPhaseAlert = useCallback(
    (project: ProjectWithProgress, phaseIndex: number): boolean => {
      const phase = PHASES[phaseIndex];
      const phaseStatus = getPhaseStatus(project, phase.title);

      // 完了済みはアラートなし
      if (phaseStatus.status === "completed") return false;

      // 期日未設定は無条件でアラート
      if (!phaseStatus.date) return true;

      // 期日超過（未完了で期日を過ぎているもの）
      const dueDate = new Date(phaseStatus.date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    },
    [getPhaseStatus, today]
  );

  // アラート数を計算（表示中の案件のすべてのアラートフェーズをカウント）
  const alertCount = useMemo(() => {
    let count = 0;
    for (const project of projects) {
      for (let i = 0; i < PHASES.length; i++) {
        if (isPhaseAlert(project, i)) {
          count++;
        }
      }
    }
    return count;
  }, [projects, isPhaseAlert]);

  return {
    today,
    getPhaseStatus,
    getCurrentPhaseIndex,
    isPhaseAlert,
    alertCount,
  };
}
