/**
 * 共通バリデーションヘルパー
 */

/**
 * 文字列IDを検証して数値に変換する
 * @param id - 検証するID文字列
 * @returns 有効な場合は数値ID、無効な場合はnull
 */
export function parseValidId(id: string): number | null {
  // 数字のみで構成されているか確認
  if (!/^\d+$/.test(id)) {
    return null;
  }

  const numId = Number(id);

  // 安全な整数範囲内で、正の値であることを確認
  if (!Number.isSafeInteger(numId) || numId <= 0) {
    return null;
  }

  return numId;
}

/**
 * YYYY-MM-DD形式の日付文字列をローカルDateオブジェクトに変換
 * @param dateStr - 日付文字列（YYYY-MM-DD形式）
 * @returns Dateオブジェクト、無効な場合はnull
 */
export function parseDateAsLocal(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;

  const [year, month, day] = parts.map(Number);

  // 基本的な範囲チェック
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  return new Date(year, month - 1, day);
}
