import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth-guard";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

// どこでもキャビネットのベースパス（環境変数で設定可能）
const CABINET_BASE_PATH = process.env.CABINET_BASE_PATH || "C:\\Person Energy\\◇Person独自案件管理\\□Person独自案件";

/**
 * 管理番号のバリデーション（数字のみ、1-10桁）
 */
function isValidManagementNumber(value: string): boolean {
  return /^\d{1,10}$/.test(value);
}

/**
 * パストラバーサル対策：パスがベースパス内に収まっているか検証
 */
function isPathWithinBase(targetPath: string, basePath: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(basePath);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

// サブフォルダの定義
const SUBFOLDERS = [
  { key: "agreement", name: "01_合意書", label: "合意書" },
  { key: "landInfo", name: "02_土地情報", label: "土地情報" },
  { key: "drawings", name: "03_図面", label: "図面" },
  { key: "simulation", name: "04_発電シミュレーション", label: "発電シミュレーション" },
  { key: "legal", name: "05_法令関係", label: "法令関係" },
  { key: "powerApplication", name: "06_電力申請", label: "電力申請" },
  { key: "materialOrder", name: "07_材料発注", label: "材料発注" },
  { key: "construction", name: "08_工事関係", label: "工事関係" },
  { key: "gridConnection", name: "09_連系資料", label: "連系資料" },
  { key: "settlement", name: "10_土地決済・所有権移転", label: "土地決済" },
];

/**
 * 管理番号からフォルダを検索
 * フォルダ名は "0012-担当者　P3327" 形式のため、先頭一致で検索
 */
function findProjectFolder(managementNumber: string): string | null {
  if (!fs.existsSync(CABINET_BASE_PATH)) {
    return null;
  }

  // ゼロ埋め4桁に正規化（"12" → "0012"）
  const padded = managementNumber.padStart(4, "0");

  try {
    const entries = fs.readdirSync(CABINET_BASE_PATH, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // フォルダ名が "0012-" で始まるかチェック（完全な管理番号一致）
        if (entry.name.startsWith(`${padded}-`)) {
          return path.join(CABINET_BASE_PATH, entry.name);
        }
      }
    }
  } catch (error) {
    console.error("[Filesystem] フォルダ検索エラー:", error instanceof Error ? error.message : "Unknown error");
  }

  return null;
}

/**
 * フォルダ内のファイル数をカウント
 */
function countFiles(folderPath: string): { count: number; files: string[] } {
  if (!fs.existsSync(folderPath)) {
    return { count: 0, files: [] };
  }

  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    const files = entries
      .filter(e => e.isFile() && !e.name.startsWith(".") && e.name !== "desktop.ini")
      .map(e => e.name);
    return { count: files.length, files };
  } catch (error) {
    console.error("[Filesystem] ファイルカウントエラー:", error instanceof Error ? error.message : "Unknown error");
    return { count: 0, files: [] };
  }
}

// 再帰走査の制限
const MAX_FILES = 500;
const MAX_DEPTH = 5;

/**
 * フォルダ内のファイル情報を再帰的に取得（制限付き）
 */
function getFilesRecursive(
  folderPath: string,
  basePath: string = folderPath,
  depth: number = 0,
  fileCount: { count: number } = { count: 0 }
): { name: string; path: string; size: number; modifiedAt: string }[] {
  // 深さ制限チェック
  if (depth > MAX_DEPTH) {
    return [];
  }

  if (!fs.existsSync(folderPath)) {
    return [];
  }

  const result: { name: string; path: string; size: number; modifiedAt: string }[] = [];

  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      // ファイル数制限チェック
      if (fileCount.count >= MAX_FILES) {
        break;
      }

      const fullPath = path.join(folderPath, entry.name);

      if (entry.isFile() && !entry.name.startsWith(".") && entry.name !== "desktop.ini") {
        const stats = fs.statSync(fullPath);
        result.push({
          name: entry.name,
          path: path.relative(basePath, fullPath),
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        });
        fileCount.count++;
      } else if (entry.isDirectory() && !entry.name.startsWith(".")) {
        result.push(...getFilesRecursive(fullPath, basePath, depth + 1, fileCount));
      }
    }
  } catch (error) {
    // 再帰走査中のエラーは記録のみ（親フォルダの結果は返す）
    console.error("[Filesystem] 再帰走査エラー:", folderPath, error instanceof Error ? error.message : "Unknown error");
  }

  return result;
}

export async function GET(request: Request) {
  // 認証チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const managementNumber = searchParams.get("managementNumber");

  // ベースパスの存在確認
  if (!fs.existsSync(CABINET_BASE_PATH)) {
    return NextResponse.json({
      error: "ファイルサーバーに接続できません",
    }, { status: 503 });
  }

  // 管理番号のバリデーション
  if (managementNumber && !isValidManagementNumber(managementNumber)) {
    return NextResponse.json({ error: "無効な管理番号形式です" }, { status: 400 });
  }

  // アクション: フォルダ検索（管理番号で検索）
  if (action === "findFolder" && managementNumber) {
    const folderPath = findProjectFolder(managementNumber);

    if (!folderPath) {
      return NextResponse.json({
        found: false,
        managementNumber,
        message: `管理番号「${managementNumber}」に該当するフォルダが見つかりません`,
      });
    }

    // パストラバーサル対策
    if (!isPathWithinBase(folderPath, CABINET_BASE_PATH)) {
      return NextResponse.json({ error: "アクセスが拒否されました" }, { status: 403 });
    }

    // サブフォルダの状況を取得
    const subfolders = SUBFOLDERS.map(sf => {
      const subfolderPath = path.join(folderPath, sf.name);
      const { count, files } = countFiles(subfolderPath);
      return {
        ...sf,
        path: subfolderPath,
        exists: fs.existsSync(subfolderPath),
        fileCount: count,
        files: files.slice(0, 5), // 最初の5ファイルのみ
      };
    });

    return NextResponse.json({
      found: true,
      managementNumber,
      folderPath,
      folderName: path.basename(folderPath),
      subfolders,
    });
  }

  // アクション: サブフォルダ内のファイル一覧
  if (action === "listFiles" && managementNumber) {
    const subfolder = searchParams.get("subfolder");
    const folderPath = findProjectFolder(managementNumber);

    if (!folderPath) {
      return NextResponse.json({ error: "フォルダが見つかりません" }, { status: 404 });
    }

    let targetPath = folderPath;
    if (subfolder) {
      const sf = SUBFOLDERS.find(s => s.key === subfolder);
      if (sf) {
        targetPath = path.join(folderPath, sf.name);
      } else {
        return NextResponse.json({ error: "無効なサブフォルダ指定です" }, { status: 400 });
      }
    }

    // パストラバーサル対策
    if (!isPathWithinBase(targetPath, CABINET_BASE_PATH)) {
      return NextResponse.json({ error: "アクセスが拒否されました" }, { status: 403 });
    }

    const files = getFilesRecursive(targetPath);

    return NextResponse.json({
      folderPath: targetPath,
      files,
      totalCount: files.length,
    });
  }

  // アクション: 謄本フォルダ検索
  if (action === "searchTouhon") {
    const query = searchParams.get("query");

    // クエリパラメータのバリデーション（DoS対策）
    if (query && (query.length > 200 || /[<>{}|\\^`]/.test(query))) {
      return NextResponse.json({ error: "無効な検索クエリです" }, { status: 400 });
    }

    const touhonPath = path.join(CABINET_BASE_PATH, "■謄本");

    // パストラバーサル対策
    if (!isPathWithinBase(touhonPath, CABINET_BASE_PATH)) {
      return NextResponse.json({ error: "アクセスが拒否されました" }, { status: 403 });
    }

    if (!fs.existsSync(touhonPath)) {
      return NextResponse.json({ error: "謄本フォルダが見つかりません" }, { status: 404 });
    }

    const files = getFilesRecursive(touhonPath);

    // クエリでフィルタリング
    const filteredFiles = query
      ? files.filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
      : files;

    return NextResponse.json({
      files: filteredFiles.slice(0, 100), // 最大100件
      totalCount: filteredFiles.length,
    });
  }

  // アクション: 写真フォルダ取得
  if (action === "getPhotos" && managementNumber) {
    const folderPath = findProjectFolder(managementNumber);

    if (!folderPath) {
      return NextResponse.json({ error: "フォルダが見つかりません" }, { status: 404 });
    }

    const photoPath = path.join(folderPath, "02_土地情報", "写真");

    // パストラバーサル対策
    if (!isPathWithinBase(photoPath, CABINET_BASE_PATH)) {
      return NextResponse.json({ error: "アクセスが拒否されました" }, { status: 403 });
    }

    if (!fs.existsSync(photoPath)) {
      return NextResponse.json({ photos: [], totalCount: 0 });
    }

    const files = getFilesRecursive(photoPath);
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
    const photos = files.filter(f =>
      imageExtensions.some(ext => f.name.toLowerCase().endsWith(ext))
    );

    return NextResponse.json({
      folderPath: photoPath,
      photos,
      totalCount: photos.length,
    });
  }

  // アクション: 全案件フォルダ一覧（インポート用）
  if (action === "listAllProjects") {
    try {
      const entries = fs.readdirSync(CABINET_BASE_PATH, { withFileTypes: true });
      const folders = entries
        .filter(e => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("■") && !e.name.startsWith("◆"))
        .map(e => {
          // フォルダ名をパース: "0001-佐東　P3327" → { number: "0001", manager: "佐東", projectNumber: "P3327" }
          const match = e.name.match(/^(\d+)-([^\s　]+)[\s　]+(.+?)(?:[\s　]+(.*))?$/);
          if (match) {
            return {
              folderName: e.name,
              managementNumber: match[1],
              manager: match[2],
              projectNumber: match[3].trim(),
              note: match[4]?.trim() || null,
            };
          }
          return {
            folderName: e.name,
            managementNumber: null,
            manager: null,
            projectNumber: null,
            note: null,
          };
        });

      return NextResponse.json({
        folders,
        totalCount: folders.length,
      });
    } catch (error) {
      console.error("[Filesystem] 全案件フォルダ一覧取得エラー:", error instanceof Error ? error.message : "Unknown error");
      return NextResponse.json({ error: "フォルダ一覧の取得に失敗しました" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
