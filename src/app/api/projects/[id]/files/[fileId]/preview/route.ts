import { NextResponse } from "next/server";
import { db } from "@/db";
import { projectFiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// ファイルプレビュー用 - 画像を直接プロキシして返す
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;
  const projectId = Number(id);
  const fileIdNum = Number(fileId);

  if (isNaN(projectId) || isNaN(fileIdNum)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // DBからファイル情報を取得
  const [file] = await db
    .select()
    .from(projectFiles)
    .where(
      and(
        eq(projectFiles.id, fileIdNum),
        eq(projectFiles.projectId, projectId)
      )
    );

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // ファイルパスを抽出
  const urlObj = new URL(file.fileUrl);
  const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/project-files\/(.+)$/);

  if (!pathMatch) {
    // 古い形式のURLの場合
    return NextResponse.redirect(file.fileUrl);
  }

  const filePath = decodeURIComponent(pathMatch[1]);

  // Supabaseからファイルをダウンロード
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .download(filePath);

  if (error || !data) {
    console.error("Failed to download file:", error);
    return NextResponse.json({ error: "Failed to load file", details: error?.message }, { status: 500 });
  }

  const arrayBuffer = await data.arrayBuffer();

  // ヘッダーを設定
  const headers: HeadersInit = {
    "Content-Type": file.fileType,
    "Content-Length": String(arrayBuffer.byteLength),
    "Cache-Control": "public, max-age=3600",
  };

  // PDFの場合はインライン表示用のヘッダーを追加
  if (file.fileType === "application/pdf") {
    headers["Content-Disposition"] = "inline";
  }

  return new NextResponse(arrayBuffer, { headers });
}
