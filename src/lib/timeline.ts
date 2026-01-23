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
    title: "案件スタート",
    duration: 0,
    unit: "business_days",
    phase: "01 開始",
    subPhases: [
      { key: "project_acquisition", title: "案件取得", date: new Date("2026-01-25") }, // サンプル日付
      { key: "initial_photography", title: "初期撮影", date: new Date("2026-01-25") }  // サンプル日付
    ]
  },
  {
    key: "initial_survey",
    title: "初期調査・設計（法令チェック等）",
    duration: 5,
    unit: "business_days",
    phase: "01 開始",
    subPhases: [
      { key: "site_guide_map", title: "現場案内図作成", date: new Date("2026-01-28") },
      { key: "legal_check", title: "法令チェック", date: new Date("2026-01-29") },
      { key: "hazard_map_check", title: "ハザードマップ確認", date: new Date("2026-01-30") },
      { key: "rough_drawing", title: "ラフ図面作成", date: new Date("2026-01-31") }
    ]
  },
  {
    key: "site_confirmation",
    title: "現地詳細確認（造成要否判断）",
    duration: 3,
    unit: "business_days",
    phase: "02 判断",
    subPhases: [
      { key: "site_survey_photos", title: "現調（不足分の写真撮影）", date: new Date("2026-02-05") }
    ]
  },
  {
    key: "submission_decision",
    title: "提出先の判断",
    duration: 0,
    unit: "business_days",
    phase: "02 判断",
    subPhases: [
      {
        key: "decision_branch",
        title: "提出先分岐",
        type: "branch",
        branchCriteria: "判断基準：「確実な案件」または「写真より現地の状態が良い」⇒双日優先",
        branches: [
          { name: "エクソル", condition: "その他の条件" },
          { name: "双日", condition: "確実な案件または現地の状態が良い場合" }
        ]
      }
    ]
  },
  {
    key: "application_contract",
    title: "申請・契約・詳細設計",
    duration: 5,
    unit: "business_days",
    phase: "03 申請",
    subPhases: [
      { key: "drawing_revision", title: "図面修正", date: new Date("2026-02-10") },
      { key: "power_simulation", title: "電力シミュレーション", date: new Date("2026-02-12") },
      { key: "neighbor_greeting", title: "近隣挨拶・伐採範囲の許可取得", date: new Date("2026-02-14") },
      { key: "land_contract", title: "土地契約", date: new Date("2026-02-17") },
      { key: "land_category_change", title: "地目変更", date: new Date("2026-02-19") },
      { key: "power_application", title: "電力申請", date: new Date("2026-02-20") },
      { key: "legal_application", title: "法令申請", date: new Date("2026-02-22") }
    ]
  },
  {
    key: "waiting_period",
    title: "法令・電力回答待ち（待機期間）",
    duration: 45,
    unit: "calendar_days",
    phase: "03 申請",
    subPhases: [
      { key: "legal_response", title: "法令回答", date: new Date("2026-02-20") }, // サンプル日付
      { key: "power_response", title: "電力回答", date: new Date("2026-02-22") }  // サンプル日付
    ]
  },
  {
    key: "final_design",
    title: "最終調整",
    duration: 3,
    unit: "business_days",
    phase: "03 申請",
    subPhases: [
      { key: "final_design_simulation", title: "本設計（再シミュレーション実施）", date: new Date("2026-03-10") }
    ]
  },
  {
    key: "final_decision",
    title: "最終判断と決済",
    duration: 5,
    unit: "business_days",
    phase: "04 決済",
    subPhases: [
      { key: "ground_survey_request", title: "地盤調査依頼", date: new Date("2026-03-15") },
      { key: "settlement_name_change", title: "決済（名義変更）", date: new Date("2026-03-20") }
    ]
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

// サブフェーズ定義
export interface WorkflowSubPhase {
  key: string;
  title: string;
  date?: Date;
  type?: 'normal' | 'branch'; // 通常項目か分岐ノードか
  branchCriteria?: string; // 分岐基準
  branches?: ReadonlyArray<{
    name: string;
    condition: string;
  }>; // 分岐先
}

// ワークフロー用TimelinePhase（フェーズ情報付き）
export interface WorkflowTimelinePhase {
  key: string;
  title: string;
  date?: Date; // 日付がない工程も許容
  startDate?: Date; // 期間開始日（待機期間などの場合）
  endDate?: Date; // 期間終了日（待機期間などの場合）
  phase: string; // "01 開始" などのフェーズ情報
  subPhases?: WorkflowSubPhase[]; // サブ項目
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
 * サブ項目の日付を計算
 */
function calculateSubPhaseDates(
  phaseKey: string,
  phaseStart: Date,
  subPhases?: readonly WorkflowSubPhase[]
): WorkflowSubPhase[] | undefined {
  if (!subPhases) return undefined;

  return subPhases.map((subPhase) => {
    // 分岐ノードの場合は日付を設定しない
    if (subPhase.type === 'branch') {
      return subPhase;
    }

    let calculatedDate: Date | undefined;

    switch (phaseKey) {
      case "initial_acquisition":
        // 案件スタート内の項目は案件スタートの日付と同じ
        calculatedDate = new Date(phaseStart);
        break;

      case "initial_survey":
        // 現場案内図、法令チェック、ハザードマップ確認：+2営業日、ラフ図面：+3営業日
        if (subPhase.key === "rough_drawing") {
          calculatedDate = addBusinessDays(phaseStart, 3);
        } else {
          calculatedDate = addBusinessDays(phaseStart, 2);
        }
        break;

      case "site_confirmation":
        // 現調：+3営業日
        calculatedDate = addBusinessDays(phaseStart, 3);
        break;

      case "submission_decision":
        // 提出先の判断：期間スタートの日付
        calculatedDate = new Date(phaseStart);
        break;

      case "application_contract":
        // すべての項目：+5営業日
        calculatedDate = addBusinessDays(phaseStart, 5);
        break;

      case "waiting_period":
        // 法令回答：+1か月、電力回答：+1.5ヶ月
        if (subPhase.key === "legal_response") {
          calculatedDate = addMonths(phaseStart, 1);
        } else if (subPhase.key === "power_response") {
          calculatedDate = addMonths(phaseStart, 1.5);
        }
        break;

      case "final_design":
        // 本設計：+3日（暦日）
        calculatedDate = addCalendarDays(phaseStart, 3);
        break;

      case "final_decision":
        // 地盤調査依頼と決済：+5日（暦日）
        calculatedDate = addCalendarDays(phaseStart, 5);
        break;

      default:
        calculatedDate = undefined;
    }

    return {
      ...subPhase,
      date: calculatedDate,
    };
  });
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
        // construction には subPhases なし / dateは設定しない
      });
      continue;
    }

    // 各フェーズの開始日と終了日を計算
    const phaseStart = new Date(currentDate);
    let phaseEnd: Date;

    // 開始日の場合はそのまま使用（案件スタートなど）
    if (workflowPhase.duration === 0) {
      phaseEnd = new Date(currentDate);
      // サブ項目の日付を計算
      const calculatedSubPhases = calculateSubPhaseDates(workflowPhase.key, phaseStart, workflowPhase.subPhases);
      phases.push({
        key: workflowPhase.key,
        title: workflowPhase.title,
        date: new Date(currentDate), // 案件スタート用にdateも保持
        startDate: phaseStart,
        endDate: phaseEnd,
        phase: workflowPhase.phase,
        subPhases: calculatedSubPhases,
      });
      continue;
    }

    // 営業日または暦日で終了日を計算
    if (workflowPhase.unit === "business_days") {
      phaseEnd = addBusinessDays(currentDate, workflowPhase.duration);
    } else {
      phaseEnd = addCalendarDays(currentDate, workflowPhase.duration);
    }

    // 次のフェーズのためにcurrentDateを更新
    currentDate = new Date(phaseEnd);

    // サブ項目の日付を計算
    const calculatedSubPhases = calculateSubPhaseDates(workflowPhase.key, phaseStart, workflowPhase.subPhases);

    phases.push({
      key: workflowPhase.key,
      title: workflowPhase.title,
      startDate: phaseStart,
      endDate: phaseEnd,
      phase: workflowPhase.phase,
      subPhases: calculatedSubPhases,
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
