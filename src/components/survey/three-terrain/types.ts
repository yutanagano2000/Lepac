export interface ThreeTerrainViewerProps {
  center?: [number, number]; // [lat, lon]
  polygon?: [number, number][]; // [[lon, lat], ...] (GeoJSON形式)
  elevationMatrix?: (number | null)[][];
  slopeMatrix?: (number | null)[][];
  gridInfo?: {
    originLat: number;
    originLon: number;
    interval: number;
    rows: number;
    cols: number;
  };
}

export interface TileTextureResult {
  canvas: HTMLCanvasElement;
  uvOffsetX: number;
  uvOffsetY: number;
  uvScaleX: number;
  uvScaleY: number;
}

/** 鉛直方向の誇張倍率（フォールバック） */
export const VERTICAL_EXAGGERATION = 2;

/**
 * 標高マトリクスと水平範囲から適切な鉛直誇張倍率を動的計算
 * 地形の起伏が水平範囲の25〜30%になるように調整
 */
export function computeDynamicExaggeration(
  elevationMatrix: (number | null)[][],
  horizontalExtent: number
): number {
  const vals: number[] = [];
  for (const row of elevationMatrix) {
    for (const v of row) {
      if (v !== null) vals.push(v);
    }
  }
  if (vals.length === 0) return VERTICAL_EXAGGERATION;

  let minElev = Infinity;
  let maxElev = -Infinity;
  for (const v of vals) {
    if (v < minElev) minElev = v;
    if (v > maxElev) maxElev = v;
  }
  const elevRange = maxElev - minElev;

  // 標高差がほぼ0（完全に平坦）ならデフォルト値
  if (elevRange < 0.1) return VERTICAL_EXAGGERATION;

  // 目標: 鉛直方向の表示レンジ = 水平範囲の 25%
  const targetVerticalRange = horizontalExtent * 0.25;
  const dynamic = targetVerticalRange / elevRange;

  // 2〜50倍の範囲にクランプ
  return Math.max(2, Math.min(50, dynamic));
}

/** GSI航空写真タイルのズームレベル */
export const GSI_PHOTO_ZOOM = 17;

/** タイル1枚のピクセルサイズ */
export const TILE_SIZE = 256;

/** 頂点ラベル文字列 */
export const VERTEX_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
