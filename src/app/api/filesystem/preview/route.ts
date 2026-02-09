import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth-guard";
import * as fs from "fs/promises";
import * as path from "path";
import { createReadStream } from "fs";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

const CABINET_BASE_PATH = process.env.CABINET_BASE_PATH || "C:\\Person Energy\\◇Person独自案件管理\\□Person独自案件";

// 最大ファイルサイズ（100MB）
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// 許可されたファイル拡張子
const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp",
  ".pdf",
  ".mp4", ".mov",
  ".xlsx", ".xls", ".docx", ".doc",
]);

/**
 * 安全なパス検証（パストラバーサル防止）
 * path.relative を使用して、ターゲットがベースパス内にあるか確認
 */
function isPathWithinBase(basePath: string, targetPath: string): boolean {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);

  // Windows: 大文字小文字を無視して比較
  const normalizedBase = resolvedBase.toLowerCase();
  const normalizedTarget = resolvedTarget.toLowerCase();

  // path.relative で相対パスを計算
  const relative = path.relative(resolvedBase, resolvedTarget);

  // ".." で始まる or 絶対パス = ベースパス外
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

/**
 * 管理番号からフォルダを検索
 * フォルダ名は "0012-担当者　P3327" 形式のため、先頭一致で検索
 */
async function findProjectFolder(managementNumber: string): Promise<string | null> {
  try {
    await fs.access(CABINET_BASE_PATH);
  } catch {
    return null;
  }

  // ゼロ埋め4桁に正規化
  const padded = managementNumber.padStart(4, "0");

  try {
    const entries = await fs.readdir(CABINET_BASE_PATH, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith(`${padded}-`)) {
          return path.join(CABINET_BASE_PATH, entry.name);
        }
      }
    }
  } catch (error) {
    console.error("フォルダ検索エラー:", error);
  }

  return null;
}

/**
 * ファイルを取得して返す（画像・PDF等）
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const managementNumber = searchParams.get("managementNumber");
  const filePath = searchParams.get("path");
  const subfolder = searchParams.get("subfolder"); // サブフォルダキー（例: landInfo, photos）

  if (!managementNumber || !filePath) {
    return NextResponse.json({ error: "managementNumber and path are required" }, { status: 400 });
  }

  // 入力バリデーション
  if (managementNumber.length > 10 || filePath.length > 500) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  // ファイル拡張子チェック
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 403 });
  }

  const folderPath = await findProjectFolder(managementNumber);
  if (!folderPath) {
    return NextResponse.json({ error: "Project folder not found" }, { status: 404 });
  }

  // サブフォルダのマッピング
  const subfolderMap: Record<string, string> = {
    agreement: "01_合意書",
    landInfo: "02_土地情報",
    photos: "02_土地情報\\写真",
    drawings: "03_図面",
    simulation: "04_発電シミュレーション",
    legal: "05_法令関係",
    powerApplication: "06_電力申請",
    materialOrder: "07_材料発注",
    construction: "08_工事関係",
    gridConnection: "09_連系資料",
    settlement: "10_土地決済・所有権移転",
  };

  let basePath = folderPath;
  if (subfolder && subfolderMap[subfolder]) {
    basePath = path.join(folderPath, subfolderMap[subfolder]);
  }

  // セキュリティ: 絶対パスが渡された場合はbasePathを無視するため、相対パスのみ許可
  if (path.isAbsolute(filePath)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 });
  }

  const fullPath = path.resolve(basePath, filePath);

  // セキュリティチェック: パストラバーサル防止（改善版）
  if (!isPathWithinBase(folderPath, fullPath)) {
    console.warn(`Blocked path traversal attempt: ${filePath}`);
    return NextResponse.json({ error: "Invalid path" }, { status: 403 });
  }

  try {
    await fs.access(fullPath);
  } catch {
    // セキュリティ: サーバーパスを漏洩しない
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    // ファイルサイズチェック
    const stats = await fs.stat(fullPath);
    if (stats.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const fileExt = path.extname(fullPath).toLowerCase();

    // MIMEタイプを決定
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".bmp": "image/bmp",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".xls": "application/vnd.ms-excel",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".doc": "application/msword",
    };

    const mimeType = mimeTypes[fileExt] || "application/octet-stream";
    const fileName = path.basename(fullPath);

    // 大きいファイルはストリーミング、小さいファイルはバッファで返す
    const STREAM_THRESHOLD = 5 * 1024 * 1024; // 5MB

    if (stats.size > STREAM_THRESHOLD) {
      // ストリーミングレスポンス
      const stream = createReadStream(fullPath);
      const webStream = Readable.toWeb(stream) as ReadableStream;

      return new NextResponse(webStream, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
          "Content-Length": stats.size.toString(),
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // 小さいファイルはバッファで返す
    const fileBuffer = await fs.readFile(fullPath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("File read error:", error);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
