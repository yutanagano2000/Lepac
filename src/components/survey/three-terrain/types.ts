export interface ThreeTerrainViewerProps {
  center?: [number, number]; // [lat, lon]
  polygon?: [number, number][]; // [[lat, lon], ...]
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

/** 鉛直方向の誇張倍率 */
export const VERTICAL_EXAGGERATION = 2;

/** GSI航空写真タイルのズームレベル */
export const GSI_PHOTO_ZOOM = 17;

/** タイル1枚のピクセルサイズ */
export const TILE_SIZE = 256;

/** 頂点ラベル文字列 */
export const VERTEX_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
