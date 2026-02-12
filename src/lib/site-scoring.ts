// 候補地スコアリングエンジン
// WAGRI農地ピン属性ベースのスコア計算

export interface SiteAttributes {
  landCategory?: string | null;       // 地目（田/畑/山林/原野等）
  areaSqm?: number | null;            // 面積（㎡）
  noushinClass?: string | null;       // 農振区分
  cityPlanningClass?: string | null;  // 都市計画区分
  ownerIntention?: string | null;     // 所有者意向
  isIdleFarmland?: boolean | null;    // 遊休農地
}

export interface ScoreResult {
  score: number;   // 0-100
  stars: number;   // 1-5
  label: string;
  details: ScoreDetail[];
}

export interface ScoreDetail {
  factor: string;
  points: number;
  reason: string;
}

export function scoreSite(attrs: SiteAttributes): ScoreResult {
  const details: ScoreDetail[] = [];
  let score = 0;

  // 農振区分（最大30点）
  const noushin = attrs.noushinClass ?? "";
  if (noushin.includes("農振外") || noushin === "なし" || noushin === "") {
    details.push({ factor: "農振区分", points: 30, reason: "農振地域外（転用容易）" });
    score += 30;
  } else if (noushin.includes("白地")) {
    details.push({ factor: "農振区分", points: 20, reason: "白地（転用検討可）" });
    score += 20;
  } else if (noushin.includes("青地") || noushin.includes("農用地区域")) {
    details.push({ factor: "農振区分", points: -10, reason: "青地（原則転用不可）" });
    score -= 10;
  } else {
    details.push({ factor: "農振区分", points: 10, reason: `区分不明（${noushin || "未入力"}）` });
    score += 10;
  }

  // 都市計画区分（最大20点）
  const cp = attrs.cityPlanningClass ?? "";
  if (cp.includes("市街化区域")) {
    details.push({ factor: "都市計画", points: 20, reason: "市街化区域" });
    score += 20;
  } else if (cp.includes("非線引き") || cp === "") {
    details.push({ factor: "都市計画", points: 15, reason: "非線引き区域" });
    score += 15;
  } else if (cp.includes("調整区域")) {
    details.push({ factor: "都市計画", points: 5, reason: "調整区域（開発許可要）" });
    score += 5;
  } else {
    details.push({ factor: "都市計画", points: 10, reason: cp || "未入力" });
    score += 10;
  }

  // 所有者意向（最大20点）
  const intention = attrs.ownerIntention ?? "";
  if (intention.includes("売")) {
    details.push({ factor: "所有者意向", points: 20, reason: "売却意向あり" });
    score += 20;
  } else if (intention.includes("貸")) {
    details.push({ factor: "所有者意向", points: 15, reason: "賃貸意向あり" });
    score += 15;
  } else {
    details.push({ factor: "所有者意向", points: 0, reason: intention || "不明" });
  }

  // 面積（最大15点）
  const area = attrs.areaSqm ?? 0;
  if (area >= 3000) {
    details.push({ factor: "面積", points: 15, reason: `${area.toLocaleString()}㎡（大規模）` });
    score += 15;
  } else if (area >= 1000) {
    details.push({ factor: "面積", points: 10, reason: `${area.toLocaleString()}㎡（中規模）` });
    score += 10;
  } else if (area >= 500) {
    details.push({ factor: "面積", points: 5, reason: `${area.toLocaleString()}㎡（小規模）` });
    score += 5;
  } else if (area > 0) {
    details.push({ factor: "面積", points: 0, reason: `${area.toLocaleString()}㎡（狭小）` });
  } else {
    details.push({ factor: "面積", points: 5, reason: "未入力" });
    score += 5;
  }

  // 遊休農地（最大15点）
  if (attrs.isIdleFarmland) {
    details.push({ factor: "遊休農地", points: 15, reason: "遊休農地（転用ハードル低）" });
    score += 15;
  } else {
    details.push({ factor: "遊休農地", points: 0, reason: "通常農地 or 不明" });
  }

  // スコアを0-100に正規化
  const normalizedScore = Math.max(0, Math.min(100, score));

  // ☆変換
  let stars: number;
  let label: string;
  if (normalizedScore >= 80) { stars = 5; label = "イチオシ"; }
  else if (normalizedScore >= 60) { stars = 4; label = "有望"; }
  else if (normalizedScore >= 40) { stars = 3; label = "検討可"; }
  else if (normalizedScore >= 20) { stars = 2; label = "要調査"; }
  else { stars = 1; label = "困難"; }

  return { score: normalizedScore, stars, label, details };
}

// 農振区分の選択肢
export const NOUSHIN_OPTIONS = [
  "農振外",
  "白地（農振地域内・農用地区域外）",
  "青地（農振地域内・農用地区域内）",
  "不明",
] as const;

// 都市計画区分の選択肢
export const CITY_PLANNING_OPTIONS = [
  "市街化区域",
  "市街化調整区域",
  "非線引き区域",
  "都市計画区域外",
  "不明",
] as const;

// 所有者意向の選択肢
export const OWNER_INTENTION_OPTIONS = [
  "売りたい",
  "貸したい",
  "自己利用",
  "不明",
] as const;

// ステータスの選択肢
export const SITE_STATUS_OPTIONS = [
  { value: "new", label: "新規", color: "bg-blue-500" },
  { value: "visited", label: "訪問済", color: "bg-yellow-500" },
  { value: "negotiating", label: "交渉中", color: "bg-orange-500" },
  { value: "contracted", label: "契約済", color: "bg-green-500" },
  { value: "rejected", label: "見送り", color: "bg-gray-500" },
] as const;

// 地目の選択肢
export const LAND_CATEGORY_OPTIONS = [
  "田", "畑", "山林", "原野", "宅地", "雑種地", "その他",
] as const;
