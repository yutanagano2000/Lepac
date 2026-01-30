/**
 * 現地住所から検索用の都道府県名・市区町村名を抽出する
 */

/**
 * 住所文字列から都道府県名と市区町村名を取得する。
 * 例: "広島県福山市瀬戸町..." → { prefectureName: "広島県", cityName: "福山市" }
 */
export function parsePrefectureAndCity(
  address: string | null
): { prefectureName: string; cityName: string } {
  if (!address?.trim()) return { prefectureName: "", cityName: "" };
  const a = address.trim();
  let prefectureName = "";
  let remainder = a;
  if (a.startsWith("広島県")) {
    prefectureName = "広島県";
    remainder = a.slice(3).trim(); // 「広島県」は3文字
  } else if (a.startsWith("岡山県")) {
    prefectureName = "岡山県";
    remainder = a.slice(3).trim(); // 「岡山県」は3文字
  }
  // 市区町村：都道府県以降で「市」「区」「町」「村」のいずれかで終わる最初の塊を取得
  const cityMatch = remainder.match(/^(.+?[市区町村])/);
  const cityName = cityMatch ? cityMatch[1] : remainder ? (remainder.split(/\s/)[0] ?? "") : "";
  return { prefectureName, cityName };
}
