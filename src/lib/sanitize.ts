/**
 * サニタイズ・バリデーション ユーティリティ
 */

/**
 * URLが安全なプロトコル（http/https）であることを検証
 * javascript: や data: などの危険なスキームを拒否
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * window.open に渡す前にURLを検証し、安全な場合のみ開く
 */
export function safeWindowOpen(
  url: string,
  target = "_blank",
  features = "noopener,noreferrer"
): void {
  if (!isSafeUrl(url)) {
    console.warn("Blocked unsafe URL:", url);
    return;
  }
  window.open(url, target, features);
}

/**
 * ファイル名に使用できない文字を置換
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() || "untitled";
}
