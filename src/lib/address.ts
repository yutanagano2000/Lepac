/**
 * 現地住所から検索用の都道府県名・市区町村名を抽出する
 */

/** 解析結果の型 */
export interface AddressParseResult {
  prefectureName: string;
  cityName: string;
}

/** 日本の都道府県リスト（3文字と4文字で分類） */
const PREFECTURES_3CHAR = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
] as const;

const PREFECTURES_4CHAR = ["神奈川県", "和歌山県", "鹿児島県"] as const;

/**
 * 住所文字列から都道府県名と市区町村名を取得する。
 * 例: "広島県福山市瀬戸町..." → { prefectureName: "広島県", cityName: "福山市" }
 *
 * @param address - 解析する住所文字列
 * @returns 都道府県名と市区町村名を含むオブジェクト
 */
export function parsePrefectureAndCity(
  address: string | null | undefined
): AddressParseResult {
  const emptyResult: AddressParseResult = { prefectureName: "", cityName: "" };

  if (address == null || typeof address !== "string") {
    return emptyResult;
  }

  const trimmed = address.trim();
  if (trimmed === "") {
    return emptyResult;
  }

  let prefectureName = "";
  let remainder = trimmed;

  // 4文字の都道府県を先にチェック（部分一致の誤検出を防ぐ）
  for (const pref of PREFECTURES_4CHAR) {
    if (trimmed.startsWith(pref)) {
      prefectureName = pref;
      remainder = trimmed.slice(pref.length).trim();
      break;
    }
  }

  // 3文字の都道府県をチェック
  if (prefectureName === "") {
    for (const pref of PREFECTURES_3CHAR) {
      if (trimmed.startsWith(pref)) {
        prefectureName = pref;
        remainder = trimmed.slice(pref.length).trim();
        break;
      }
    }
  }

  // 市区町村：都道府県以降で「市」「区」「町」「村」のいずれかで終わる最初の塊を取得
  let cityName = "";
  if (remainder) {
    const cityMatch = remainder.match(/^(.+?[市区町村])/);
    if (cityMatch && cityMatch[1]) {
      cityName = cityMatch[1];
    } else {
      // 市区町村が見つからない場合は最初の空白区切りまで
      const firstPart = remainder.split(/\s/)[0];
      cityName = firstPart ?? "";
    }
  }

  return { prefectureName, cityName };
}
