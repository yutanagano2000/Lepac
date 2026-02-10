export const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
export const MANAGER_OPTIONS = ["吉國", "刎本", "松下", "佐東", "川田", "近永", "その他"];

// フェーズ定義（WORKFLOW_PHASESベース・スケジュール画面と統一）
// subTitles: progressテーブルのtitleと紐付けるサブフェーズ名群
export const PHASES = [
  { key: "initial_acquisition", title: "案件開始", subtitle: "案件取得・初期撮影", order: 1, subTitles: ["案件取得", "初期撮影"] },
  { key: "initial_survey", title: "初期調査", subtitle: "法令チェック・ラフ図面", order: 2, subTitles: ["現場案内図作成", "法令チェック", "ハザードマップ確認", "ラフ図面作成"] },
  { key: "site_confirmation", title: "現地確認", subtitle: "現地写真撮影", order: 3, subTitles: ["現調（不足分の写真撮影）"] },
  { key: "submission_decision", title: "提出判断", subtitle: "提出可否チェック", order: 4, subTitles: ["提出可否チェック"] },
  { key: "application_contract", title: "契約/設計", subtitle: "土地契約・シミュレーション", order: 5, subTitles: ["図面修正", "電力シミュレーション", "近隣挨拶・伐採範囲の許可取得", "土地契約", "地目変更"] },
  { key: "application", title: "各種申請", subtitle: "電力・法令申請", order: 6, subTitles: ["DD", "電力申請", "法令申請"] },
  { key: "waiting_period", title: "回答待ち", subtitle: "法令・電力回答待ち", order: 7, subTitles: ["法令回答", "電力回答"] },
  { key: "final_design", title: "最終調整", subtitle: "再シミュレーション", order: 8, subTitles: ["本設計（再シミュレーション実施）"] },
  { key: "final_decision", title: "最終決済", subtitle: "地盤調査・名義変更", order: 9, subTitles: ["地盤調査依頼", "決済（名義変更）"] },
  { key: "construction", title: "工事", subtitle: "着工～完了", order: 10, subTitles: ["工事着工～完了"] },
] as const;

export type PhaseKey = (typeof PHASES)[number]["key"];
