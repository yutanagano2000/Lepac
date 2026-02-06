export const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
export const MANAGER_OPTIONS = ["吉國", "刎本", "松下", "佐東", "川田", "近永", "その他"];

// フェーズ定義
export const PHASES = [
  { key: "agreement", title: "合意書", order: 1 },
  { key: "submission", title: "案件提出", order: 2 },
  { key: "survey", title: "現調", order: 3 },
  { key: "land_sale_contract", title: "土地売買契約", order: 4 },
  { key: "land_contract", title: "土地契約", order: 5 },
  { key: "legal_application", title: "法令申請", order: 6 },
  { key: "legal_approval", title: "法令許可", order: 7 },
  { key: "power_application", title: "電力申請", order: 8 },
  { key: "power_response", title: "電力回答", order: 9 },
  { key: "ss_request", title: "SS依頼", order: 10 },
  { key: "ss_execution", title: "SS実施", order: 11 },
  { key: "land_settlement", title: "土地決済", order: 12 },
  { key: "order", title: "発注", order: 13 },
  { key: "construction_start", title: "着工", order: 14 },
  { key: "grid_connection", title: "連系", order: 15 },
  { key: "completion", title: "完工", order: 16 },
] as const;

export type PhaseKey = (typeof PHASES)[number]["key"];
