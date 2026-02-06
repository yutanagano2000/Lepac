import type { Project } from "@/db/schema";

export const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

export const MANAGER_OPTIONS = ["吉國", "刎本", "松下", "佐東", "川田", "近永", "その他"];

export const PROJECT_SEARCH_RECENT_KEY = "geo_checker_recent_project_searches";
export const MAX_RECENT_SEARCHES = 3;

// テーブルカラム定義
export const TABLE_COLUMNS: { key: keyof Project | string; label: string; width?: string }[] = [
  { key: "managementNumber", label: "管理番号", width: "120px" },
  { key: "manager", label: "担当", width: "80px" },
  { key: "client", label: "販売先", width: "120px" },
  { key: "projectNumber", label: "販売店 案件番号", width: "140px" },
  { key: "availability", label: "可否", width: "60px" },
  { key: "businessType", label: "業務", width: "80px" },
  { key: "designPower", label: "設計/電力", width: "100px" },
  { key: "sales", label: "営業", width: "80px" },
  { key: "parcelCount", label: "筆数", width: "60px" },
  { key: "prefecture", label: "都道府県", width: "100px" },
  { key: "blank1", label: "(空白)", width: "60px" },
  { key: "link", label: "リンク", width: "80px" },
  { key: "agreementMonth", label: "合意書 計上月", width: "120px" },
  { key: "projectSubmissionScheduled", label: "案件提出 予定日", width: "130px" },
  { key: "projectSubmissionDate", label: "案件提出日", width: "110px" },
  { key: "fellingConsentRequest", label: "伐採/工事 承諾書依頼", width: "160px" },
  { key: "fellingConsentComplete", label: "伐採/工事 承諾書揃う", width: "160px" },
  { key: "siteInvestigation", label: "現調", width: "80px" },
  { key: "level", label: "レベル", width: "80px" },
  { key: "landContractRequestScheduled", label: "土地売契 依頼予定日", width: "150px" },
  { key: "landContractRequest", label: "土地売契 依頼", width: "120px" },
  { key: "landContractScheduled", label: "土地契約 締結予定日", width: "150px" },
  { key: "landContractDate", label: "土地契約 締結日", width: "130px" },
  { key: "landPrice", label: "土地代", width: "100px" },
  { key: "landowner", label: "地権者", width: "120px" },
  { key: "landownerAddress", label: "地権者住所", width: "200px" },
  { key: "landAreaTotal", label: "土地 ㎡数", width: "100px" },
  { key: "correctionStatus", label: "更正 有無", width: "90px" },
  { key: "inheritanceStatus", label: "相続 有無", width: "90px" },
  { key: "mortgageStatus", label: "抵当権 有無", width: "100px" },
  { key: "hazardAtHome", label: "ハザード（アットホーム）", width: "170px" },
  { key: "photo", label: "写真", width: "60px" },
  { key: "snowfall", label: "積雪", width: "60px" },
  { key: "windSpeedValue", label: "風速", width: "60px" },
  { key: "neighborhoodFelling", label: "近隣伐採", width: "90px" },
  { key: "landRemarks", label: "土地備考", width: "150px" },
  { key: "landCategory", label: "地目", width: "80px" },
  { key: "nourinStatus", label: "農振 有無", width: "90px" },
  { key: "nourinScrivenerRequest", label: "農振 行政書士依頼", width: "150px" },
  { key: "nourinApplicationScheduled", label: "農振 申請予定日", width: "130px" },
  { key: "nourinApplicationDate", label: "農振 申請日", width: "110px" },
  { key: "nourinCompletionScheduled", label: "農振 完了予定日", width: "130px" },
  { key: "nourinCompletionDate", label: "農振 完了日", width: "110px" },
  { key: "noutenStatus", label: "農転 有無", width: "90px" },
  { key: "landCategoryChangeRequest", label: "地目変更 営業への依頼", width: "170px" },
  { key: "noutenScrivenerRequest", label: "農転 行政書士依頼", width: "150px" },
  { key: "noutenApplicationScheduled", label: "農転/地目 申請予定日", width: "160px" },
  { key: "noutenApplicationDate", label: "農転/地目 申請日", width: "130px" },
  { key: "noutenCompletionScheduled", label: "農転/地目 完了予定日", width: "160px" },
  { key: "noutenCompletionDate", label: "農転/地目 完了日", width: "130px" },
  { key: "regulationCategory", label: "規制 区分", width: "100px" },
  { key: "developmentStatus", label: "造成 有無", width: "90px" },
  { key: "residentialDevApplicationScheduled", label: "宅造法 申請予定日", width: "140px" },
  { key: "residentialDevApplicationDate", label: "宅造法 申請日", width: "120px" },
  { key: "residentialDevCompletionScheduled", label: "宅造法 完了予定日", width: "140px" },
  { key: "residentialDevCompletionDate", label: "宅造法 完了日", width: "120px" },
  { key: "otherRegulations", label: "その他 法令", width: "120px" },
  { key: "regulationApplicationScheduled", label: "法令申請予定日", width: "130px" },
  { key: "regulationApplicationPaymentDate", label: "法令申請日 支払日", width: "150px" },
  { key: "regulationPermitScheduled", label: "法令許可予定日", width: "130px" },
  { key: "regulationPermitDate", label: "法令許可日", width: "110px" },
  { key: "completionNotification", label: "完了届", width: "80px" },
  { key: "regulationRemarks", label: "法令備考", width: "150px" },
  { key: "moduleType", label: "ﾓｼﾞｭｰﾙ", width: "100px" },
  { key: "moduleCount", label: "ﾓｼﾞｭｰﾙ 枚数", width: "110px" },
  { key: "moduleCapacity", label: "ﾓｼﾞｭｰﾙ 容量", width: "110px" },
  { key: "systemCapacity", label: "ｼｽﾃﾑ 容量", width: "100px" },
  { key: "powerSimulation", label: "発電シミュレーション", width: "160px" },
  { key: "powerCompany", label: "電力 会社", width: "100px" },
  { key: "powerApplicationDestination", label: "電力申請 申請先", width: "130px" },
  { key: "powerApplicationScheduled", label: "電力 申請予定日", width: "130px" },
  { key: "powerApplicationDate", label: "電力 申請日", width: "110px" },
  { key: "powerResponseScheduled", label: "電力 回答予定日", width: "130px" },
  { key: "powerResponseDate", label: "電力 回答日", width: "110px" },
  { key: "estimatedBurden", label: "概算 負担金額", width: "120px" },
  { key: "additionalBurden", label: "追加 負担金額", width: "120px" },
  { key: "burdenPaymentDate", label: "負担金 支払日", width: "120px" },
  { key: "interconnectionStatus", label: "連系可否", width: "90px" },
  { key: "interconnectionDetails", label: "連系詳細", width: "150px" },
  { key: "powerRemarks", label: "電力備考", width: "150px" },
  { key: "landSettlementDocScheduled", label: "土地決済書類回収予定", width: "170px" },
  { key: "landSettlementDocCollection", label: "土地決済書類回収", width: "150px" },
  { key: "landSettlementScheduled", label: "土地決済予定日", width: "130px" },
  { key: "landSettlementDate", label: "土地 決済日", width: "110px" },
  { key: "ownershipTransferAppScheduled", label: "所有権移転登記申請予定", width: "180px" },
  { key: "ownershipTransferApplication", label: "所有権移転登記申請", width: "160px" },
  { key: "ownershipTransferCompScheduled", label: "所有権移転登記完了予定", width: "180px" },
  { key: "ownershipTransferCompletion", label: "所有権移転登記完了", width: "160px" },
  { key: "developmentCost", label: "造成費用", width: "100px" },
  { key: "surveyingCost", label: "測量費用", width: "100px" },
  { key: "administrativeCost", label: "行政費用", width: "100px" },
  { key: "otherCostTotal", label: "その他 費用合計", width: "140px" },
  { key: "neighborGreetingRequestScheduled", label: "近隣挨拶 依頼予定日", width: "160px" },
  { key: "neighborGreetingRequestDate", label: "近隣挨拶 依頼日", width: "130px" },
  { key: "neighborGreetingScheduled", label: "近隣挨拶 予定日", width: "130px" },
  { key: "neighborGreetingDate", label: "近隣挨拶 実施日", width: "130px" },
  { key: "ssRequestScheduled", label: "SS 依頼予定日", width: "120px" },
  { key: "ssRequestDate", label: "SS 依頼日", width: "100px" },
  { key: "ssScheduled", label: "SS 予定日", width: "100px" },
  { key: "ssDate", label: "SS 実施日", width: "100px" },
  { key: "orderCreationRequestScheduled", label: "注文書作成依頼予定", width: "160px" },
  { key: "orderCreationRequest", label: "注文書作成依頼", width: "130px" },
  { key: "orderScheduled", label: "発注予定日", width: "110px" },
  { key: "orderDate", label: "発注日", width: "90px" },
  { key: "deliveryDate", label: "納品日", width: "90px" },
  { key: "constructionStartScheduled", label: "着工 予定日", width: "110px" },
  { key: "constructionStartDate", label: "着工日", width: "90px" },
  { key: "constructionEndScheduled", label: "完工 予定日", width: "110px" },
  { key: "constructionEndDate", label: "完工日", width: "90px" },
  { key: "externalLineWorkDate", label: "外線 工事日", width: "110px" },
  { key: "leadInWorkDate", label: "引込 工事日", width: "110px" },
  { key: "interconnectionScheduled", label: "連系 予定日", width: "110px" },
  { key: "interconnectionDate", label: "連系日", width: "90px" },
  { key: "burdenLandOther", label: "負担金土地 その他", width: "150px" },
  { key: "confirmationItems", label: "確認事項", width: "150px" },
  { key: "completionMonth", label: "完成月", width: "100px" },
  { key: "constructionComplete", label: "完工", width: "60px" },
];

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROJECT_SEARCH_RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr)
      ? arr.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): string[] {
  const q = query.trim();
  if (!q) return getRecentSearches();
  const prev = getRecentSearches();
  const next = [q, ...prev.filter((x) => x !== q)].slice(0, MAX_RECENT_SEARCHES);
  try {
    localStorage.setItem(PROJECT_SEARCH_RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
