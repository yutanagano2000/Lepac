import type { WorkflowSubPhase } from "@/lib/timeline";

export type PhaseStatus = "pending" | "in_progress" | "completed";

export interface HorizontalPhaseData {
  key: string;
  title: string;
  phase: string;
  status: PhaseStatus;
  totalSubs: number;
  completedSubs: number;
  subPhases?: readonly WorkflowSubPhase[];
  startDate?: Date;
  endDate?: Date;
  isOverdue: boolean;   // 期日超過（赤）
  isUpcoming: boolean;  // 1週間以内に期日到来（黄）
}

// フェーズ手動上書きの型
export interface PhaseOverride {
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD
  note?: string;
  subPhaseOrder?: string[];              // カスタム順序 → カーソルチェーンモード発動
  skippedSubPhases?: string[];           // スキップするサブフェーズ
  customDurations?: Record<string, number>; // サブフェーズごとのカスタム工数
  fixedDates?: Record<string, string>;   // 手動固定日付（カーソルリスタート）
}

export type PhaseOverrides = Record<string, PhaseOverride>;

// プロジェクト全体のフェーズ上書き（フェーズ間移動対応）
export interface ProjectPhaseOverrides {
  phases: Record<string, PhaseOverride>;
  taskAssignments?: Record<string, string>; // subPhaseKey → targetPhaseKey（フェーズ間移動）
}
