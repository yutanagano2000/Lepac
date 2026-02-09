/**
 * 共通バリデーションヘルパー
 */

/**
 * 文字列IDを検証して数値に変換する
 * @param id - 検証するID文字列
 * @returns 有効な場合は数値ID、無効な場合はnull
 */
export function parseValidId(id: string | null | undefined): number | null {
  if (id == null || typeof id !== "string") {
    return null;
  }

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
 * 月の日数を取得（うるう年対応）
 * @param year - 年
 * @param month - 月（1-12）
 * @returns その月の日数
 */
function getDaysInMonth(year: number, month: number): number {
  // month は 1-12 なので、Dateコンストラクタでは month として使い、0日目=前月最終日
  return new Date(year, month, 0).getDate();
}

/**
 * YYYY-MM-DD形式の日付文字列をローカルDateオブジェクトに変換
 * ゼロパディングなし（2025-1-15）も許容
 * @param dateStr - 日付文字列（YYYY-MM-DD形式またはYYYY-M-D形式）
 * @returns Dateオブジェクト、無効な場合はnull
 */
export function parseDateAsLocal(dateStr: string | null | undefined): Date | null {
  if (dateStr == null || typeof dateStr !== "string") {
    return null;
  }

  const trimmed = dateStr.trim();
  if (trimmed === "") {
    return null;
  }

  // 形式チェック: YYYY-MM-DD または YYYY-M-D（ゼロパディングなし許容）
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    return null;
  }

  const parts = trimmed.split("-");
  if (parts.length !== 3) return null;

  const yearStr = parts[0];
  const monthStr = parts[1];
  const dayStr = parts[2];

  if (!yearStr || !monthStr || !dayStr) return null;

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // 基本的な範囲チェック
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1) return null;

  // その月の実際の日数をチェック（2月30日などを弾く）
  const maxDays = getDaysInMonth(year, month);
  if (day > maxDays) return null;

  return new Date(year, month - 1, day);
}

/**
 * 日付の有効性を検証
 * @param dateStr - 日付文字列（YYYY-MM-DD形式）
 * @returns 有効な日付かどうか
 */
export function isValidDate(dateStr: string | null | undefined): boolean {
  return parseDateAsLocal(dateStr) !== null;
}
