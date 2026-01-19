// フェーズ定義（完工からの相対月数）
export const PHASE_OFFSETS = [
  { key: "noushin", title: "農振申請", monthsOffset: -10.1, optional: true },
  { key: "denryoku", title: "電力申請", monthsOffset: -5.8 },
  { key: "genchi", title: "現地調査", monthsOffset: -5.5 },
  { key: "teishutsu", title: "案件提出", monthsOffset: -5.0 },
  { key: "denryoku_kaito", title: "電力回答", monthsOffset: -2.5 },
  { key: "nouten", title: "農転・地目申請", monthsOffset: -2.5 },
  { key: "tochi_keiyaku", title: "土地契約", monthsOffset: -2.4 },
  { key: "chakko", title: "着工", monthsOffset: -1.9 },
  { key: "tochi_kessai", title: "土地決済", monthsOffset: -1.1 },
  { key: "kanko", title: "完工", monthsOffset: 0 },
  { key: "renkei", title: "連系（発電開始）", monthsOffset: 2.7 },
] as const;

export type PhaseKey = (typeof PHASE_OFFSETS)[number]["key"];

export interface TimelinePhase {
  key: PhaseKey;
  title: string;
  date: Date;
  optional?: boolean;
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
  const baseDate = new Date(year, month - 1, 1);

  return PHASE_OFFSETS.filter((phase) => !phase.optional || includeNoushin).map(
    (phase) => ({
      key: phase.key,
      title: phase.title,
      date: addMonths(baseDate, phase.monthsOffset),
      optional: phase.optional,
    })
  );
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
