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

/**
 * 5点の標高データから傾斜角・傾斜率・最急勾配方向を計算
 * distance: 中心と各方位点の距離 (m)
 */
export function calculateSlope(
  points: ElevationPoint[],
  distance: number = 10
): {
  slopeDegrees: number;
  slopePercent: number;
  aspectDegrees: number;
  aspectDirection: string;
} {
  const center = points.find((p) => p.label === "center")!;
  const north = points.find((p) => p.label === "north")!;
  const south = points.find((p) => p.label === "south")!;
  const east = points.find((p) => p.label === "east")!;
  const west = points.find((p) => p.label === "west")!;

  // 南北方向の勾配 (dz/dy): 北が正
  const dzdyNS = (north.elevation - south.elevation) / (2 * distance);
  // 東西方向の勾配 (dz/dx): 東が正
  const dzdxEW = (east.elevation - west.elevation) / (2 * distance);

  // 最大傾斜の大きさ
  const maxGradient = Math.sqrt(dzdxEW * dzdxEW + dzdyNS * dzdyNS);

  const slopeDegrees =
    Math.atan(maxGradient) * (180 / Math.PI);
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
