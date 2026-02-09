/**
 * グリッドベースの傾斜解析
 * 標高マトリクスから各セルの傾斜角・方向を算出し、統計値を返す
 */

import { classifySlope, aspectToDirection, type SlopeClassification } from "./slope";

export interface CellSlope {
  row: number;
  col: number;
  degrees: number;
  percent: number;
  aspectDegrees: number;
  aspectDirection: string;
  classification: SlopeClassification;
}

export interface SlopeStats {
  meanDegrees: number;
  maxDegrees: number;
  minDegrees: number;
  stdDegrees: number;
  minElevation: number;
  maxElevation: number;
  avgElevation: number;
  elevationRange: number;
  /** 分類別の面積割合（%） */
  distribution: { label: string; color: string; percent: number }[];
  /** 便利なエイリアス（DB保存用） */
  avgSlope: number;
  maxSlope: number;
  minSlope: number;
  flatPercent: number;
  steepPercent: number;
}

export interface CrossSectionPoint {
  distance: number; // 始点からの距離(m)
  elevation: number;
  lat: number;
  lon: number;
}

/**
 * 標高マトリクスから全セルの傾斜角・方向を算出
 * 有限差分法: 隣接セル（東西南北）から勾配を計算
 * @param z 標高マトリクス (rows x cols)、null はデータなし
 * @param cellSize セルサイズ（メートル）
 */
export function calculateGridSlopes(
  z: (number | null)[][],
  cellSize: number
): CellSlope[] {
  const rows = z.length;
  const cols = z[0]?.length ?? 0;
  const slopes: CellSlope[] = [];

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const center = z[r][c];
      const north = z[r - 1][c];
      const south = z[r + 1][c];
      const east = z[r][c + 1];
      const west = z[r][c - 1];

      // 5点とも有効値が必要
      if (
        center === null ||
        north === null ||
        south === null ||
        east === null ||
        west === null
      )
        continue;

      const dzdyNS = (north - south) / (2 * cellSize);
      const dzdxEW = (east - west) / (2 * cellSize);
      const gradient = Math.sqrt(dzdxEW * dzdxEW + dzdyNS * dzdyNS);

      const degrees = Math.atan(gradient) * (180 / Math.PI);
      const percent = gradient * 100;

      let aspectDeg = Math.atan2(-dzdxEW, -dzdyNS) * (180 / Math.PI);
      if (aspectDeg < 0) aspectDeg += 360;

      slopes.push({
        row: r,
        col: c,
        degrees: Math.round(degrees * 100) / 100,
        percent: Math.round(percent * 100) / 100,
        aspectDegrees: Math.round(aspectDeg * 10) / 10,
        aspectDirection: aspectToDirection(aspectDeg),
        classification: classifySlope(degrees),
      });
    }
  }

  return slopes;
}

/**
 * 傾斜データから統計値を算出
 */
export function computeStats(
  slopes: CellSlope[],
  z: (number | null)[][]
): SlopeStats {
  if (slopes.length === 0) {
    return {
      meanDegrees: 0,
      maxDegrees: 0,
      minDegrees: 0,
      stdDegrees: 0,
      minElevation: 0,
      maxElevation: 0,
      avgElevation: 0,
      elevationRange: 0,
      distribution: [],
      avgSlope: 0,
      maxSlope: 0,
      minSlope: 0,
      flatPercent: 0,
      steepPercent: 0,
    };
  }

  const degs = slopes.map((s) => s.degrees);
  const sum = degs.reduce((a, b) => a + b, 0);
  const mean = sum / degs.length;
  const max = Math.max(...degs);
  const min = Math.min(...degs);
  const variance =
    degs.reduce((acc, d) => acc + (d - mean) ** 2, 0) / degs.length;
  const std = Math.sqrt(variance);

  // 標高の範囲（-500m〜4000m範囲外の異常値はDEM no-dataとして統計から除外）
  const elevations: number[] = [];
  for (const row of z) {
    for (const v of row) {
      if (v !== null && v >= -500 && v <= 4000) elevations.push(v);
    }
  }
  const minElev = elevations.length > 0 ? Math.min(...elevations) : 0;
  const maxElev = elevations.length > 0 ? Math.max(...elevations) : 0;
  const avgElev = elevations.length > 0
    ? elevations.reduce((a, b) => a + b, 0) / elevations.length
    : 0;

  // 分類別分布
  const classCount: Record<string, { label: string; color: string; count: number }> = {};
  for (const s of slopes) {
    const key = s.classification.label;
    if (!classCount[key]) {
      classCount[key] = {
        label: s.classification.label,
        color: s.classification.color,
        count: 0,
      };
    }
    classCount[key].count++;
  }

  const total = slopes.length;
  const distribution = Object.values(classCount).map((c) => ({
    label: c.label,
    color: c.color,
    percent: Math.round((c.count / total) * 1000) / 10,
  }));

  // 平坦・急傾斜の割合を計算
  const flatPct = distribution.find((d) => d.label === "平坦")?.percent ?? 0;
  const steepPct = (distribution.find((d) => d.label === "急")?.percent ?? 0) +
    (distribution.find((d) => d.label === "非常に急")?.percent ?? 0);

  return {
    meanDegrees: Math.round(mean * 100) / 100,
    maxDegrees: Math.round(max * 100) / 100,
    minDegrees: Math.round(min * 100) / 100,
    stdDegrees: Math.round(std * 100) / 100,
    minElevation: Math.round(minElev * 10) / 10,
    maxElevation: Math.round(maxElev * 10) / 10,
    avgElevation: Math.round(avgElev * 10) / 10,
    elevationRange: Math.round((maxElev - minElev) * 10) / 10,
    distribution,
    // エイリアス（DB保存・UI表示用）
    avgSlope: Math.round(mean * 100) / 100,
    maxSlope: Math.round(max * 100) / 100,
    minSlope: Math.round(min * 100) / 100,
    flatPercent: flatPct,
    steepPercent: steepPct,
  };
}

/**
 * 断面ラインに沿った標高プロファイルを抽出
 * ラインを等間隔にサンプリングし、最近傍グリッドセルの標高を返す
 * @param z 標高マトリクス
 * @param originLat グリッド原点（北端）の緯度
 * @param originLon グリッド原点（西端）の経度
 * @param cellSize セルサイズ（メートル）
 * @param lineCoords 断面ラインの座標 [lon, lat][] （GeoJSON形式）
 * @param numSamples サンプル数
 */
export function extractCrossSection(
  z: (number | null)[][],
  originLat: number,
  originLon: number,
  cellSize: number,
  lineCoords: [number, number][],
  numSamples: number = 50
): CrossSectionPoint[] {
  if (lineCoords.length < 2) return [];

  const EARTH_RADIUS_M = 6371000;
  const centerLat = originLat;
  const dLat = (cellSize / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLon =
    (cellSize / (EARTH_RADIUS_M * Math.cos((centerLat * Math.PI) / 180))) *
    (180 / Math.PI);

  // ライン全長を計算
  let totalDist = 0;
  const segDists: number[] = [0];
  for (let i = 1; i < lineCoords.length; i++) {
    const d = haversineDistance(
      lineCoords[i - 1][1],
      lineCoords[i - 1][0],
      lineCoords[i][1],
      lineCoords[i][0]
    );
    totalDist += d;
    segDists.push(totalDist);
  }

  const result: CrossSectionPoint[] = [];
  const step = totalDist / (numSamples - 1);

  for (let i = 0; i < numSamples; i++) {
    const dist = i * step;
    // ライン上の補間位置を求める
    const { lat, lon } = interpolateAlongLine(lineCoords, segDists, dist);

    // グリッドセルのインデックス
    const row = Math.round((originLat - lat) / dLat);
    const col = Math.round((lon - originLon) / dLon);

    let elevation = NaN;
    if (row >= 0 && row < z.length && col >= 0 && col < (z[0]?.length ?? 0)) {
      const v = z[row][col];
      if (v !== null) elevation = v;
    }

    if (!isNaN(elevation)) {
      result.push({
        distance: Math.round(dist * 10) / 10,
        elevation,
        lat,
        lon,
      });
    }
  }

  return result;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function interpolateAlongLine(
  coords: [number, number][],
  segDists: number[],
  targetDist: number
): { lat: number; lon: number } {
  for (let i = 1; i < coords.length; i++) {
    if (targetDist <= segDists[i]) {
      const segLen = segDists[i] - segDists[i - 1];
      const t = segLen > 0 ? (targetDist - segDists[i - 1]) / segLen : 0;
      return {
        lat: coords[i - 1][1] + t * (coords[i][1] - coords[i - 1][1]),
        lon: coords[i - 1][0] + t * (coords[i][0] - coords[i - 1][0]),
      };
    }
  }
  const last = coords[coords.length - 1];
  return { lat: last[1], lon: last[0] };
}
