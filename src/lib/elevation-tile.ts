/**
 * GSI DEM タイルを使った高速標高取得
 * 個別API呼び出しではなく、タイル画像から標高を一括抽出
 */

import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import bbox from "@turf/bbox";
import { point, polygon as turfPolygon } from "@turf/helpers";
import { PNG } from "pngjs";

const EARTH_RADIUS_M = 6371000;

// DEMタイルURL（優先度順：DEM5A → DEM5B → DEM5C → DEM10B）
const DEM_TILE_URLS = [
  "https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png",
  "https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/{z}/{x}/{y}.png",
  "https://cyberjapandata.gsi.go.jp/xyz/dem5c_png/{z}/{x}/{y}.png",
  "https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png",
];
const TILE_SIZE = 256;
const MAX_ZOOM = 15;

// タイルキャッシュ（バッファデータ）
const tileCache = new Map<string, Uint8Array | null>();
const CACHE_MAX = 100;

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
 * 緯度経度からタイル座標を計算
 */
function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number; px: number; py: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lon + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);

  // タイル内のピクセル位置
  const px = Math.floor(((lon + 180) / 360 * n - x) * TILE_SIZE);
  const py = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n - y) * TILE_SIZE);

  return { x, y, px: Math.min(px, TILE_SIZE - 1), py: Math.min(py, TILE_SIZE - 1) };
}

/**
 * タイル画像を取得してピクセルデータに変換（サーバーサイド対応）
 */
async function fetchTilePixels(x: number, y: number, z: number): Promise<Uint8Array | null> {
  const key = `${z}/${x}/${y}`;

  if (tileCache.has(key)) {
    return tileCache.get(key) ?? null;
  }

  // DEM5A → DEM5B → DEM5C → DEM10B の順にフォールバック
  for (const urlTemplate of DEM_TILE_URLS) {
    try {
      const url = urlTemplate.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
      const response = await fetch(url);

      if (!response.ok) continue;

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const png = PNG.sync.read(buffer);
      const pixels = new Uint8Array(png.data);

      // タイル全体が無効データ（全ピクセルが無効値）かチェック
      // エッジと内部の両方をサンプリングして海岸線タイルを正しく検出
      let hasValidPixel = false;
      const sampleStep = Math.floor(TILE_SIZE / 8); // より細かいサンプリング（32px間隔）
      // エッジもチェック（0, sampleStep, ..., TILE_SIZE-1）
      for (let sy = 0; sy < TILE_SIZE && !hasValidPixel; sy += sampleStep) {
        for (let sx = 0; sx < TILE_SIZE && !hasValidPixel; sx += sampleStep) {
          if (getElevationFromPixels(pixels, sx, sy) !== null) {
            hasValidPixel = true;
          }
        }
      }
      // 最後にエッジ（右下隅）もチェック
      if (!hasValidPixel && getElevationFromPixels(pixels, TILE_SIZE - 1, TILE_SIZE - 1) !== null) {
        hasValidPixel = true;
      }
      if (!hasValidPixel) continue; // 全サンプル点が無効→次のDEMソースへフォールバック

      // キャッシュサイズ制限
      if (tileCache.size >= CACHE_MAX) {
        const firstKey = tileCache.keys().next().value;
        if (firstKey) tileCache.delete(firstKey);
      }

      tileCache.set(key, pixels);
      return pixels;
    } catch {
      continue;
    }
  }

  console.warn(`[Tile DEM] ${key} → 全DEMソースで取得失敗`);
  tileCache.set(key, null);
  return null;
}

/**
 * RGB値から標高を計算（GSI DEM PNG形式）
 * 標高 = (R * 256 * 256 + G * 256 + B) * 0.01 - 100000
 * 無効値: R=128, G=0, B=0
 */
function rgbToElevation(r: number, g: number, b: number): number | null {
  const x = r * 65536 + g * 256 + b;

  // GSI DEM無効値: x = 2^23 (R=128, G=0, B=0)
  if (x === 8388608) {
    return null;
  }

  // x < 2^23: 正の標高, x > 2^23: 負の標高（海面下）
  const elevation = x < 8388608 ? x * 0.01 : (x - 16777216) * 0.01;

  // 日本国内の標高範囲外（-500m〜4000m）は無効とみなす
  if (elevation < -500 || elevation > 4000) {
    return null;
  }

  return elevation;
}

/**
 * ピクセル配列から特定位置の標高を取得
 */
function getElevationFromPixels(pixels: Uint8Array, px: number, py: number): number | null {
  if (px < 0 || px >= TILE_SIZE || py < 0 || py >= TILE_SIZE) {
    return null;
  }

  const idx = (py * TILE_SIZE + px) * 4; // RGBA
  const r = pixels[idx];
  const g = pixels[idx + 1];
  const b = pixels[idx + 2];

  return rgbToElevation(r, g, b);
}

/**
 * 複数のグリッド点の標高を一括取得（タイルベース）
 * APIコール数を大幅削減（225回→数回程度）
 */
export async function fetchElevationBatchFromTiles(
  points: GridPoint[]
): Promise<GridElevation[]> {
  if (points.length === 0) return [];

  const zoom = MAX_ZOOM;

  // 必要なタイルを特定してグループ化
  const tilePoints = new Map<string, { tile: { x: number; y: number }; points: { point: GridPoint; px: number; py: number }[] }>();

  for (const pt of points) {
    const { x, y, px, py } = latLonToTile(pt.lat, pt.lon, zoom);
    const key = `${x}/${y}`;

    if (!tilePoints.has(key)) {
      tilePoints.set(key, { tile: { x, y }, points: [] });
    }
    tilePoints.get(key)!.points.push({ point: pt, px, py });
  }

  console.log(`[Tile DEM] ${points.length}点 → ${tilePoints.size}タイルに集約`);

  // タイルを並列取得（最大同時10）
  const tileEntries = Array.from(tilePoints.entries());
  const chunkSize = 10;
  const tilePixelMap = new Map<string, Uint8Array | null>();

  for (let i = 0; i < tileEntries.length; i += chunkSize) {
    const chunk = tileEntries.slice(i, i + chunkSize);
    const promises = chunk.map(async ([key, { tile }]) => {
      const pixels = await fetchTilePixels(tile.x, tile.y, zoom);
      return { key, pixels };
    });
    const results = await Promise.all(promises);
    for (const { key, pixels } of results) {
      tilePixelMap.set(key, pixels);
    }
  }

  // 各点の標高を抽出
  const results: GridElevation[] = [];

  for (const [key, { points: pts }] of tilePoints) {
    const pixels = tilePixelMap.get(key);

    for (const { point, px, py } of pts) {
      let elevation = NaN;

      if (pixels) {
        const elev = getElevationFromPixels(pixels, px, py);
        if (elev !== null) {
          elevation = elev;
        }
      }

      results.push({ ...point, elevation });
    }
  }

  return results;
}

/**
 * ポリゴン内を指定間隔でグリッド分割し、内部の点のみ返す
 */
export function generateGridPoints(
  polygonCoords: [number, number][],
  intervalMeters: number
): { points: GridPoint[]; rows: number; cols: number; originLat: number; originLon: number } {
  const poly = turfPolygon([polygonCoords]);
  const [minLon, minLat, maxLon, maxLat] = bbox(poly);

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
      const lat = maxLat - r * dLat;
      const lon = minLon + c * dLon;

      const pt = point([lon, lat]);
      if (booleanPointInPolygon(pt, poly)) {
        points.push({ lat, lon, row: r, col: c });
      }
    }
  }

  return { points, rows, cols, originLat: maxLat, originLon: minLon };
}

/**
 * GridElevation 配列を2D行列に変換
 */
export function buildElevationMatrix(
  elevations: GridElevation[],
  rows: number,
  cols: number
): { z: (number | null)[][]; x: number[]; y: number[] } {
  const z: (number | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  for (const pt of elevations) {
    if (!isNaN(pt.elevation)) {
      z[pt.row][pt.col] = pt.elevation;
    }
  }

  const x = Array.from({ length: cols }, (_, i) => i);
  const y = Array.from({ length: rows }, (_, i) => i);

  return { z, x, y };
}
