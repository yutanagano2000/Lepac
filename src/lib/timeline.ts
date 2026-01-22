// フェーズ定義（完工からの相対月数）
// タイトルは PROGRESS_TITLES と統一（重複防止のため）
export const PHASE_OFFSETS = [
  { key: "noushin", title: "農振申請", monthsOffset: -10.1, optional: true },
  { key: "denryoku", title: "電力申請", monthsOffset: -5.8 },
  { key: "genchi", title: "現調", monthsOffset: -5.5 },
  { key: "teishutsu", title: "案件提出", monthsOffset: -5.0 },
  { key: "ss_irai", title: "SS依頼", monthsOffset: -2.7 },
  { key: "denryoku_kaito", title: "電力回答", monthsOffset: -2.5 },
  { key: "nouten", title: "法令申請", monthsOffset: -2.5 },
  { key: "tochi_keiyaku", title: "土地契約", monthsOffset: -2.4 },
  { key: "chakko", title: "着工", monthsOffset: -1.9 },
  { key: "ss_jisshi", title: "SS実施", monthsOffset: -1.8 },
  { key: "tochi_kessai", title: "土地決済", monthsOffset: -1.1 },
  { key: "kanko", title: "完工", monthsOffset: 0 },
  { key: "renkei", title: "連系", monthsOffset: 2.7 },
] as const;

// 新しいワークフロー工程定義（開始日からの順方向計算）
export const WORKFLOW_PHASES = [
  {
    key: "initial_acquisition",
    title: "案件取得・初期撮影",
    duration: 0,
    unit: "business_days",
    phase: "01 開始"
  },
  {
    key: "initial_survey",
    title: "初期調査・設計（法令チェック等）",
    duration: 5,
    unit: "business_days",
    phase: "01 開始"
  },
  {
    key: "site_confirmation",
    title: "現地詳細確認（造成要否判断）",
    duration: 3,
    unit: "business_days",
    phase: "02 判断"
  },
  {
    key: "application_contract",
    title: "申請・契約・設計（図面修正・土地契約）",
    duration: 5,
    unit: "business_days",
    phase: "03 申請"
  },
  {
    key: "waiting_period",
    title: "行政・電力申請待ち（待機期間）",
    duration: 45,
    unit: "calendar_days",
    phase: "03 申請"
  },
  {
    key: "final_design",
    title: "本設計（再シミュレーション）",
    duration: 3,
    unit: "business_days",
    phase: "03 申請"
  },
  {
    key: "final_decision",
    title: "最終判断と決済",
    duration: 5,
    unit: "business_days",
    phase: "04 決済"
  },
  {
    key: "construction",
    title: "工事着工～完了",
    duration: 90,
    unit: "calendar_days",
    phase: "05 完了"
  },
] as const;

export type PhaseKey = (typeof PHASE_OFFSETS)[number]["key"];

export interface TimelinePhase {
  key: PhaseKey;
  title: string;
  date: Date;
  optional?: boolean;
}

// ワークフロー用TimelinePhase（フェーズ情報付き）
export interface WorkflowTimelinePhase {
  key: string;
  title: string;
  date?: Date; // 日付がない工程も許容
  phase: string; // "01 開始" などのフェーズ情報
}

/**
 * 月を加算（小数対応）
 * 例: -5.8ヶ月 → 5ヶ月と約24日前
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const wholeMonths = Math.floor(months);
  const fractionalDays = (months - wholeMonths) * 30;

  result.setMonth(result.getMonth() + wholeMonths);
  result.setDate(result.getDate() + Math.round(fractionalDays));

  return result;
}

/**
 * 営業日を加算（土日を除く）
 */
function addBusinessDays(date: Date, businessDays: number): Date {
  const result = new Date(date);
  let added = 0;

  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // 0 = 日曜日, 6 = 土曜日
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }

  return result;
}

/**
 * 暦日を加算
 */
function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 完成月から各フェーズの予定日を計算
 *
 * @param completionMonth 完成月（例: "2026-03"）
 * @param includeNoushin 農振申請を含めるか（農振除外が必要な案件のみtrue）
 */
export function calculateTimeline(
  completionMonth: string,
  includeNoushin: boolean = false
): TimelinePhase[] {
  const [year, month] = completionMonth.split("-").map(Number);
  const baseDate = new Date(year, month - 1, 15); // 完成月の15日を基準とする

  return PHASE_OFFSETS.filter((phase) => !("optional" in phase) || includeNoushin).map(
    (phase) => ({
      key: phase.key,
      title: phase.title,
      date: addMonths(baseDate, phase.monthsOffset),
      optional: "optional" in phase ? phase.optional : undefined,
    })
  );
}

/**
 * 開始日を起点としたワークフロー式スケジュール計算
 *
 * @param startDate 開始日
 * @returns 各工程の予定日リスト
 */
export function calculateWorkflowTimeline(startDate: Date): WorkflowTimelinePhase[] {
  const phases: WorkflowTimelinePhase[] = [];
  let currentDate = new Date(startDate);

  for (const workflowPhase of WORKFLOW_PHASES) {
    // 工事着工～完了の場合は日付計算をスキップ
    if (workflowPhase.key === "construction") {
      phases.push({
        key: workflowPhase.key,
        title: workflowPhase.title,
        phase: workflowPhase.phase,
        // dateは設定しない
      });
      continue;
    }

    // 開始日の場合はそのまま使用
    if (workflowPhase.duration === 0) {
      phases.push({
        key: workflowPhase.key,
        title: workflowPhase.title,
        date: new Date(currentDate),
        phase: workflowPhase.phase,
      });
      continue;
    }

    // 営業日または暦日で加算
    if (workflowPhase.unit === "business_days") {
      currentDate = addBusinessDays(currentDate, workflowPhase.duration);
    } else {
      currentDate = addCalendarDays(currentDate, workflowPhase.duration);
    }

    phases.push({
      key: workflowPhase.key,
      title: workflowPhase.title,
      date: new Date(currentDate),
      phase: workflowPhase.phase,
    });
  }

  return phases;
}

/**
 * 日付を YYYY.M.D 形式でフォーマット
 */
export function formatDateJp(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}
