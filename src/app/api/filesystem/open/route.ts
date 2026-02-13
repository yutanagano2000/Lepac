import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export const dynamic = "force-dynamic";

// 許可されたベースパス（環境変数で設定可能）
const ALLOWED_BASE_PATHS = (
  process.env.CABINET_BASE_PATH || "C:\\Person Energy\\◇Person独自案件管理\\□Person独自案件"
).split(",").map(p => p.trim()).filter(p => p.length > 0);

/**
 * パスがホワイトリスト内にあるか検証
 */
function isPathAllowed(targetPath: string): boolean {
  // ホワイトリストが空の場合は全て拒否
  if (ALLOWED_BASE_PATHS.length === 0) {
    return false;
  }

  const normalizedTarget = path.resolve(targetPath).toLowerCase();

  for (const basePath of ALLOWED_BASE_PATHS) {
    const normalizedBase = path.resolve(basePath).toLowerCase();
    // path.relative で判定（..で始まらなければ子パス）
    const relative = path.relative(normalizedBase, normalizedTarget);
    if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
      return true;
    }
  }
  return false;
}

/**
 * エクスプローラーでフォルダを開く
 * POST /api/filesystem/open
 * Body: { path: string }
 *
 * セキュリティ対策:
 * - spawn + 引数配列でコマンド注入を防止
 * - ホワイトリストでアクセス可能なパスを制限
 * - OS判定でクロスプラットフォーム対応
 */
export async function POST(request: NextRequest) {
  // 認証チェック（CSRF保護付き）
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { path: folderPath } = body;

    if (!folderPath || typeof folderPath !== "string") {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    // パス長制限（DoS防止）- 正規化前のチェック
    if (folderPath.length > 500) {
      return NextResponse.json({ error: "Path too long" }, { status: 400 });
    }

    // パスの正規化と検証
    const normalizedPath = path.resolve(folderPath);

    // パス長制限（DoS防止）- 正規化後のチェック
    if (normalizedPath.length > 1000) {
      return NextResponse.json({ error: "Path too long" }, { status: 400 });
    }

    // セキュリティ: ホワイトリストチェック
    if (!isPathAllowed(normalizedPath)) {
      console.warn(`Blocked folder open attempt: ${normalizedPath}`);
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // パスの存在確認
    if (!fs.existsSync(normalizedPath)) {
      return NextResponse.json({ error: "Path not found" }, { status: 404 });
    }

    // OS判定でファイルマネージャーを選択
    const platform = os.platform();
    let command: string;
    let args: string[];

    if (platform === "win32") {
      command = "explorer";
      args = [normalizedPath];
    } else if (platform === "darwin") {
      command = "open";
      args = [normalizedPath];
    } else {
      // Linux
      command = "xdg-open";
      args = [normalizedPath];
    }

    // spawn で安全にコマンド実行（引数は配列で渡す）
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });

    // 子プロセスのエラーを監視
    child.on("error", (err) => {
      console.error(`Spawn error for ${command}:`, err.message);
    });

    child.unref();

    return NextResponse.json({ success: true });
  } catch (error) {
    // セキュリティ: 内部エラー詳細を漏洩させない
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Open folder error:", errorMessage);
    return NextResponse.json({ error: "Failed to open folder" }, { status: 500 });
  }
}
