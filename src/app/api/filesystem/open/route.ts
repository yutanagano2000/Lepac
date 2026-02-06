import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth-guard";
import { exec } from "child_process";
import * as fs from "fs";

export const dynamic = "force-dynamic";

/**
 * エクスプローラーでフォルダを開く
 * POST /api/filesystem/open
 * Body: { path: string }
 */
export async function POST(request: Request) {
  // 認証チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { path: folderPath } = body;

    if (!folderPath || typeof folderPath !== "string") {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    // パスの存在確認
    if (!fs.existsSync(folderPath)) {
      return NextResponse.json({ error: "Path not found" }, { status: 404 });
    }

    // Windowsのエクスプローラーでフォルダを開く
    // セキュリティ: パスをダブルクォートで囲む
    const command = `explorer "${folderPath}"`;

    exec(command, (error) => {
      if (error) {
        console.error("Explorer open error:", error);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Open folder error:", error);
    return NextResponse.json({ error: "Failed to open folder" }, { status: 500 });
  }
}
