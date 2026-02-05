import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth-guard";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

const CABINET_BASE_PATH = process.env.CABINET_BASE_PATH || "C:\\Person Energy\\◇Person独自案件管理\\□Person独自案件";

/**
 * 案件番号からフォルダを検索
 */
function findProjectFolder(projectNumber: string): string | null {
  if (!fs.existsSync(CABINET_BASE_PATH)) {
    return null;
  }

  try {
    const entries = fs.readdirSync(CABINET_BASE_PATH, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.includes(projectNumber)) {
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
export async function GET(request: Request) {
  // 認証チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const projectNumber = searchParams.get("projectNumber");
  const filePath = searchParams.get("path");
  const subfolder = searchParams.get("subfolder"); // サブフォルダキー（例: landInfo, photos）

  if (!projectNumber || !filePath) {
    return NextResponse.json({ error: "projectNumber and path are required" }, { status: 400 });
  }

  const folderPath = findProjectFolder(projectNumber);
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

  const fullPath = path.join(basePath, filePath);

  // セキュリティチェック: パストラバーサル防止
  const normalizedPath = path.normalize(fullPath);
  if (!normalizedPath.startsWith(folderPath)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 });
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: `File not found: ${fullPath}` }, { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

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

    const mimeType = mimeTypes[ext] || "application/octet-stream";
    const fileName = path.basename(fullPath);

    // 画像をそのまま返す
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
