import { NextResponse } from "next/server";
import { db } from "@/db";
import { projectFiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { ApiError, createErrorResponse } from "@/lib/api-error";
import { requireProjectAccess } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// ファイルダウンロード用の署名付きURLを生成
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

    // 認証・組織・プロジェクト所有権チェック
    const authResult = await requireProjectAccess(projectId);
    if (!authResult.success) {
      return authResult.response;
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

    // 相対パスかフルURLかを判定
    const isRelativePath = !file.fileUrl.startsWith("http");

    // Vercel Blob URLの場合は直接リダイレクト
    if (!isRelativePath && file.fileUrl.includes("blob.vercel-storage.com")) {
      return NextResponse.redirect(file.fileUrl, { status: 302 });
    }

    let filePath: string;

    if (isRelativePath) {
      // 相対パスの場合: そのまま使用
      filePath = file.fileUrl;
    } else {
      // フルURLの場合: パスを抽出（Supabase Storage想定）
      let urlObj: URL;
      try {
        urlObj = new URL(file.fileUrl);
      } catch {
        throw ApiError.badRequest("不正なファイルURLです");
      }

      // セキュリティ: ホスト検証（Supabase URLの場合のみ）
      const supabaseUrl = process.env.SUPABASE_URL;
      let supabaseHost = "";
      if (supabaseUrl) {
        try {
          supabaseHost = new URL(supabaseUrl).host;
        } catch {
          // 無効なURLは無視
        }
      }

      if (supabaseHost && !urlObj.host.endsWith(supabaseHost)) {
        throw ApiError.badRequest("不正なファイルURLです");
      }

      // URLからパスを抽出
      const bucketPattern = new RegExp(
        `\\/storage\\/v1\\/object\\/(?:sign|public)\\/${STORAGE_BUCKET}\\/(.+)$`
      );
      const pathMatch = urlObj.pathname.match(bucketPattern);

      if (!pathMatch) {
        throw ApiError.badRequest("不正なファイルURLです");
      }

      filePath = decodeURIComponent(pathMatch[1]);
    }

    // 新しい署名付きURLを生成（1時間有効）
    const { data, error } = await getSupabaseAdmin().storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 3600, {
        download: file.fileName, // ダウンロード時のファイル名を指定
      });

    if (error || !data) {
      throw ApiError.internal(
        "ダウンロードURLの生成に失敗しました",
        `Failed to create signed URL: ${error?.message}`
      );
    }

    // 新しいURLにリダイレクト
    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    return createErrorResponse(error, "ファイルのダウンロードに失敗しました");
  }
}
