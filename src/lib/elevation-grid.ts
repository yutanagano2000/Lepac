/**
 * 標高グリッド生成・取得ユーティリティ
 * GSI DEM API をバッチ取得（並列度制限+キャッシュ）
 */

import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import bbox from "@turf/bbox";
import { point, polygon as turfPolygon } from "@turf/helpers";

// ─── GSI 標高API ─────────────────────────────────────
const GSI_API =
  "https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php";

// インメモリキャッシュ（1時間TTL、最大50000エントリ）
const cache = new Map<string, { elevation: number; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000;
const CACHE_MAX = 50000;

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(8)},${lon.toFixed(8)}`;
}

function getCached(lat: number, lon: number): number | null {
  const key = cacheKey(lat, lon);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.elevation;
}

function setCache(lat: number, lon: number, elevation: number): void {
  const key = cacheKey(lat, lon);
  cache.set(key, { elevation, timestamp: Date.now() });
  if (cache.size > CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

/** 単一座標の標高を取得（キャッシュ付き） */
export async function fetchElevation(
  lat: number,
  lon: number
): Promise<number> {
  const cached = getCached(lat, lon);
  if (cached !== null) return cached;

  const url = `${GSI_API}?lon=${lon}&lat=${lat}&outtype=JSON`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GSI API error: ${res.status}`);
  }
  const data = await res.json();
  const elevation = parseFloat(data.elevation);
  if (isNaN(elevation)) {
    throw new Error(`標高データなし（${lat.toFixed(6)}, ${lon.toFixed(6)}）`);
  }

  setCache(lat, lon, elevation);
  return elevation;
}

// ─── 並列度制限付きバッチ取得 ──────────────────────────

interface GridPoint {
  lat: number;
  lon: number;
  row: number;
  col: number;
}

export interface GridElevation extends GridPoint {
  elevation: number;
}

/**
 * 並列度を制限しながら標高をバッチ取得
 * @param points グリッド点配列
 * @param concurrency 同時リクエスト数（デフォルト10）
 */
export async function fetchElevationBatch(
  points: GridPoint[],
  concurrency: number = 10
): Promise<GridElevation[]> {
  const results: GridElevation[] = [];
  const queue = [...points];

  async function worker() {
    while (queue.length > 0) {
      const pt = queue.shift()!;
      try {
        const elevation = await fetchElevation(pt.lat, pt.lon);
        results.push({ ...pt, elevation });
      } catch {
        // 標高取得失敗点はスキップ（海上等）
        results.push({ ...pt, elevation: NaN });
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, points.length) },
    () => worker()
  );
  await Promise.all(workers);

  return results;
}

// ─── グリッド生成 ────────────────────────────────────

const EARTH_RADIUS_M = 6371000;

/**
 * ポリゴン内を指定間隔でグリッド分割し、内部の点のみ返す
 * @param polygonCoords GeoJSON Polygon の coordinates[0]（[lon, lat][] 配列）
 * @param intervalMeters グリッド間隔（メートル）
 * @returns グリッド点配列 + 行列サイズ情報
 */
export function generateGridPoints(
  polygonCoords: [number, number][],
  intervalMeters: number
): { points: GridPoint[]; rows: number; cols: number; originLat: number; originLon: number } {
  const poly = turfPolygon([polygonCoords]);
  const [minLon, minLat, maxLon, maxLat] = bbox(poly);

  // メートル → 緯度経度の差分
  const centerLat = (minLat + maxLat) / 2;
  const dLat = (intervalMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLon =
    (intervalMeters /
      (EARTH_RADIUS_M * Math.cos((centerLat * Math.PI) / 180))) *
    (180 / Math.PI);

  const rows = Math.ceil((maxLat - minLat) / dLat) + 1;
  const cols = Math.ceil((maxLon - minLon) / dLon) + 1;

  const points: GridPoint[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lat = maxLat - r * dLat; // 北から南へ
      const lon = minLon + c * dLon; // 西から東へ

      const pt = point([lon, lat]);
      if (booleanPointInPolygon(pt, poly)) {
        points.push({ lat, lon, row: r, col: c });
      }
    }
  }

  return { points, rows, cols, originLat: maxLat, originLon: minLon };
}

/**
 * GridElevation 配列を2D行列に変換（Plotly Surface用）
 * ポリゴン外のセルは NaN
 */
export function buildElevationMatrix(
  elevations: GridElevation[],
  rows: number,
  cols: number
): { z: (number | null)[][]; x: number[]; y: number[] } {
  // NaN で初期化
  const z: (number | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  for (const pt of elevations) {
    if (!isNaN(pt.elevation)) {
      z[pt.row][pt.col] = pt.elevation;
    }
  }

  // x: 列インデックス（東西方向の距離m相当）、y: 行インデックス（南北方向）
  const x = Array.from({ length: cols }, (_, i) => i);
  const y = Array.from({ length: rows }, (_, i) => i);

  return { z, x, y };
}
