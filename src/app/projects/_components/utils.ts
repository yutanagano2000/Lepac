// 完成月フォーマット（表示用）
export function formatCompletionMonth(value: string | null | undefined): string {
  if (!value) return "";
  const [year, month] = value.split("-");
  return `${year}年${parseInt(month, 10)}月`;
}

// フィルター用のフォーマット
export function formatCompletionMonthForFilter(value: string | null | undefined): string {
  if (!value) return "未設定";
  const [year, month] = value.split("-");
  return `${year}年${parseInt(month, 10)}月`;
}

// セル値を取得するヘルパー（表示用）
export function getCellValue(
  project: Record<string, unknown>,
  key: string
): string {
  const value = project[key];
  if (value === null || value === undefined) return "-";
  if (key === "completionMonth") return formatCompletionMonth(value as string) || "-";
  return String(value);
}

// セル値を取得するヘルパー（編集用 - 生の値を返す）
export function getRawCellValue(
  project: Record<string, unknown>,
  key: string
): string {
  const value = project[key];
  if (value === null || value === undefined) return "";
  return String(value);
}
