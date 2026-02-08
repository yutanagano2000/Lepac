/**
 * 日付フォーマットユーティリティ
 *
 * プロジェクト全体で使用する日付フォーマット関数を統合
 */

/**
 * 日付を YYYY.M.D 形式でフォーマット
 * 例: 2026.1.19
 *
 * @param date - フォーマットする日付
 * @returns フォーマット済み文字列、日付がない場合は空文字
 */
export function formatYyyyMd(date: Date | null | undefined): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}

/**
 * 日付を M/D 形式（短縮形式）でフォーマット
 * 例: 1/19
 *
 * @param date - フォーマットする日付
 * @returns フォーマット済み文字列、日付がない場合は "-"
 */
export function formatDateShort(date: Date | null | undefined): string {
  if (!date) return "-";
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

/**
 * 日付を YYYY.M.D 形式でフォーマット（nullの場合は "-" を返す）
 * formatYyyyMdとの違い: 日付がない場合に "-" を返す
 *
 * @param date - フォーマットする日付
 * @returns フォーマット済み文字列、日付がない場合は "-"
 */
export function formatDateFull(date: Date | null | undefined): string {
  if (!date) return "-";
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}

/**
 * 日付を日本語形式（YYYY年M月D日）でフォーマット
 * 例: 2026年1月19日
 *
 * @param date - フォーマットする日付
 * @returns フォーマット済み文字列
 */
export function formatDateJp(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}年${m}月${d}日`;
}

/**
 * 日付を YYYY-MM-DD 形式（ISO形式）でフォーマット
 * API送信やinput[type="date"]で使用
 *
 * @param date - フォーマットする日付
 * @returns フォーマット済み文字列
 */
export function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * YYYY.M.D または YYYY/M/D 形式の文字列をDateにパース
 *
 * @param text - パースする文字列
 * @returns パースされたDate、無効な形式の場合はnull
 */
export function parseDateText(text: string): Date | null {
  const match = text.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (!match) return null;

  const [, y, m, d] = match;
  const parsed = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * YYYY-MM-DD 形式の文字列をDateにパース
 *
 * @param dateStr - パースする文字列（例: "2026-01-19"）
 * @returns パースされたDate、無効な形式の場合はnull
 */
export function parseIsoDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // タイムゾーン問題を回避するため、T00:00:00を付加
  const parsed = new Date(dateStr + "T00:00:00");
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * 相対的な日付表示（今日、昨日、n日前など）
 *
 * @param date - 表示する日付
 * @returns 相対的な日付文字列
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "昨日";
  if (diffDays === -1) return "明日";
  if (diffDays > 0 && diffDays <= 7) return `${diffDays}日前`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}日後`;

  return formatYyyyMd(date);
}
