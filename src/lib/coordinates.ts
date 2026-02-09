/**
 * 座標文字列の正規化・パース
 * カンマ・スラッシュ・空白区切り（例: "34.386542/131.56731", "34.386542, 131.56731"）に対応
 */

const COORD_SPLIT = /[\s,\/]+/;

/** 座標パース結果の型 */
export interface CoordinateParseResult {
  lat: string;
  lon: string;
}

/** 数値座標の型 */
export interface NumericCoordinate {
  lat: number;
  lon: number;
}

/**
 * 座標文字列を分割して配列を返す（前後の空白はトリム）
 * @param value - 座標文字列
 * @returns 分割された座標値の配列
 */
export function splitCoordinateString(value: string | null | undefined): string[] {
  if (value == null || typeof value !== "string") return [];
  const trimmed = value.trim();
  if (trimmed === "") return [];
  return trimmed.split(COORD_SPLIT).map((p) => p.trim()).filter(Boolean);
}

/**
 * 座標値が有効な範囲内かチェック
 * @param lat - 緯度
 * @param lon - 経度
 * @returns 有効な範囲内かどうか
 */
function isValidCoordinateRange(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * 座標文字列をパースし、緯度・経度を返す。無効な場合は null
 * @param value - 座標文字列
 * @returns パース結果、無効な場合はnull
 */
export function parseCoordinateString(
  value: string | null | undefined
): CoordinateParseResult | null {
  const parts = splitCoordinateString(value);
  if (parts.length < 2) return null;

  const lat = parts[0];
  const lon = parts[1];

  if (!lat || !lon) return null;

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);

  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return null;
  }

  return { lat, lon };
}

/**
 * 座標文字列をパースし、数値として返す。無効な場合は null
 * @param value - 座標文字列
 * @returns 数値座標、無効な場合はnull
 */
export function parseCoordinateAsNumber(
  value: string | null | undefined
): NumericCoordinate | null {
  const parts = splitCoordinateString(value);
  if (parts.length < 2) return null;

  const lat = parts[0];
  const lon = parts[1];

  if (!lat || !lon) return null;

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);

  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return null;
  }

  if (!isValidCoordinateRange(latNum, lonNum)) {
    return null;
  }

  return { lat: latNum, lon: lonNum };
}

/**
 * 座標文字列を正規化する（緯度,経度 の形式で返す）。無効な場合は空文字
 * @param value - 座標文字列
 * @returns 正規化された座標文字列
 */
export function normalizeCoordinateString(value: string | null | undefined): string {
  const parsed = parseCoordinateString(value);
  if (!parsed) return "";
  return `${parsed.lat},${parsed.lon}`;
}
