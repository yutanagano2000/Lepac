/**
 * 傾斜計算ユーティリティ
 * 中心座標 + 東西南北4点の標高から傾斜角・傾斜率・方向を算出
 */

export interface ElevationPoint {
  lat: number;
  lon: number;
  elevation: number;
  label: "center" | "north" | "south" | "east" | "west";
}

export interface SlopeResult {
  centerElevation: number;
  points: ElevationPoint[];
  slopeDegrees: number;
  slopePercent: number;
  aspectDegrees: number;
  aspectDirection: string;
  classification: SlopeClassification;
}

export interface SlopeClassification {
  level: number;
  label: string;
  color: string;
}

const EARTH_RADIUS_M = 6371000;

/**
 * 中心座標から東西南北に offsetMeters だけ離れた4点を算出
 */
export function getSurroundingPoints(
  lat: number,
  lon: number,
  offsetMeters: number = 10
): { lat: number; lon: number; label: ElevationPoint["label"] }[] {
  const dLat = (offsetMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLon =
    (offsetMeters / (EARTH_RADIUS_M * Math.cos((lat * Math.PI) / 180))) *
    (180 / Math.PI);

  return [
    { lat, lon, label: "center" as const },
    { lat: lat + dLat, lon, label: "north" as const },
    { lat: lat - dLat, lon, label: "south" as const },
    { lat, lon: lon + dLon, label: "east" as const },
    { lat, lon: lon - dLon, label: "west" as const },
  ];
}

/** 傾斜計算の結果型 */
export interface SlopeCalculationResult {
  slopeDegrees: number;
  slopePercent: number;
  aspectDegrees: number;
  aspectDirection: string;
}

/** 傾斜計算エラー */
export class SlopeCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlopeCalculationError";
  }
}

/**
 * 5点の標高データから傾斜角・傾斜率・最急勾配方向を計算
 * @param points - 5点の標高データ（center, north, south, east, west）
 * @param distance - 中心と各方位点の距離 (m)、デフォルト10m
 * @returns 傾斜計算結果
 * @throws SlopeCalculationError 必要なポイントが不足している場合
 */
export function calculateSlope(
  points: ElevationPoint[],
  distance: number = 10
): SlopeCalculationResult {
  // 入力検証
  if (!Array.isArray(points) || points.length < 5) {
    throw new SlopeCalculationError("5点の標高データが必要です");
  }

  if (distance <= 0 || !Number.isFinite(distance)) {
    throw new SlopeCalculationError("距離は正の有限数である必要があります");
  }

  const center = points.find((p) => p.label === "center");
  const north = points.find((p) => p.label === "north");
  const south = points.find((p) => p.label === "south");
  const east = points.find((p) => p.label === "east");
  const west = points.find((p) => p.label === "west");

  // 必要なポイントの存在確認
  if (!center || !north || !south || !east || !west) {
    const missing: string[] = [];
    if (!center) missing.push("center");
    if (!north) missing.push("north");
    if (!south) missing.push("south");
    if (!east) missing.push("east");
    if (!west) missing.push("west");
    throw new SlopeCalculationError(`不足しているポイント: ${missing.join(", ")}`);
  }

  // 標高値の検証
  const allPoints = [center, north, south, east, west];
  for (const point of allPoints) {
    if (!Number.isFinite(point.elevation)) {
      throw new SlopeCalculationError(`無効な標高値: ${point.label} = ${point.elevation}`);
    }
  }

  // 南北方向の勾配 (dz/dy): 北が正
  const dzdyNS = (north.elevation - south.elevation) / (2 * distance);
  // 東西方向の勾配 (dz/dx): 東が正
  const dzdxEW = (east.elevation - west.elevation) / (2 * distance);

  // 最大傾斜の大きさ
  const maxGradient = Math.sqrt(dzdxEW * dzdxEW + dzdyNS * dzdyNS);

  const slopeDegrees = Math.atan(maxGradient) * (180 / Math.PI);
  const slopePercent = maxGradient * 100;

  // 最急勾配方向（下り方向）: atan2(-dy, -dx) → 北を0°として時計回り
  let aspectDegrees = Math.atan2(-dzdxEW, -dzdyNS) * (180 / Math.PI);
  if (aspectDegrees < 0) aspectDegrees += 360;

  const aspectDirection = aspectToDirection(aspectDegrees);

  return {
    slopeDegrees: Math.round(slopeDegrees * 100) / 100,
    slopePercent: Math.round(slopePercent * 100) / 100,
    aspectDegrees: Math.round(aspectDegrees * 10) / 10,
    aspectDirection,
  };
}

/**
 * 傾斜角を5段階に分類
 */
export function classifySlope(degrees: number): SlopeClassification {
  if (degrees < 3) return { level: 1, label: "平坦", color: "green" };
  if (degrees < 8) return { level: 2, label: "緩やか", color: "yellow" };
  if (degrees < 15) return { level: 3, label: "やや急", color: "orange" };
  if (degrees < 30) return { level: 4, label: "急", color: "red" };
  return { level: 5, label: "非常に急", color: "darkred" };
}

/**
 * 角度（北=0°時計回り）を8方位の日本語名に変換
 */
export function aspectToDirection(degree: number): string {
  const directions = [
    "北", "北東", "東", "南東", "南", "南西", "西", "北西",
  ];
  const index = Math.round(degree / 45) % 8;
  return directions[index];
}
