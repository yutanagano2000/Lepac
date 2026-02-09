/**
 * フォルダのnoteから完成月を抽出
 * @example "連系2026年3月(目安)" → "2026-03"
 */
export function extractCompletionMonth(note: string | null): string {
  if (!note) return "";
  const match = note.match(/連系(\d{4})年(\d{1,2})月/);
  if (match) {
    return `${match[1]}-${String(parseInt(match[2])).padStart(2, "0")}`;
  }
  return "";
}
