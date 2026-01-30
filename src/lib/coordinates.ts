/**
 * 座標文字列の正規化・パース
 * カンマ・スラッシュ・空白区切り（例: "34.386542/131.56731", "34.386542, 131.56731"）に対応
 */

const COORD_SPLIT = /[\s,\/]+/;

/**
 * 座標文字列を分割して [緯度, 経度] の配列を返す（前後の空白はトリム）
 */
export function splitCoordinateString(value: string): string[] {
  if (!value || typeof value !== "string") return [];
  return value.split(COORD_SPLIT).map((p) => p.trim()).filter(Boolean);
}

/**
 * 座標文字列をパースし、緯度・経度を返す。無効な場合は null
 */
export function parseCoordinateString(
  value: string
): { lat: string; lon: string } | null {
  const parts = splitCoordinateString(value);
  if (parts.length < 2) return null;
  const lat = parts[0];
  const lon = parts[1];
  if (
    lat == null ||
    lon == null ||
    isNaN(parseFloat(lat)) ||
    isNaN(parseFloat(lon))
  )
    return null;
  return { lat, lon };
}

/**
 * 座標文字列を正規化する（緯度,経度 の形式で返す）。無効な場合は空文字
 */
export function normalizeCoordinateString(value: string): string {
  const parsed = parseCoordinateString(value);
  if (!parsed) return "";
  return `${parsed.lat},${parsed.lon}`;
}
