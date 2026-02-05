import { NextResponse } from "next/server";
import { db } from "@/db";
import { projectFiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { ApiError, createErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// ファイルプレビュー用 - 画像を直接プロキシして返す
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;
    const projectId = Number(id);
    const fileIdNum = Number(fileId);

    if (isNaN(projectId) || isNaN(fileIdNum)) {
      throw ApiError.badRequest("無効なIDです");
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
      throw ApiError.notFound("ファイルが見つかりません");
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
      throw ApiError.internal(
        "ファイルの読み込みに失敗しました",
        `Failed to download file: ${error?.message}`
      );
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
  } catch (error) {
    return createErrorResponse(error, "ファイルのプレビューに失敗しました");
  }
}
