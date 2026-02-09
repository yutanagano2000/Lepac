import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { projectFiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { ApiError, createErrorResponse } from "@/lib/api-error";
import { requireProjectAccessWithCsrf } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// ファイル削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;
    const projectId = Number(id);
    const fileIdNum = Number(fileId);

    if (isNaN(projectId) || isNaN(fileIdNum)) {
      throw ApiError.badRequest("無効なIDです");
    }

    // 認証・組織・プロジェクト所有権 + CSRFチェック
    const authResult = await requireProjectAccessWithCsrf(request, projectId);
    if (!authResult.success) {
      return authResult.response;
    }

    // ファイル情報を取得
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

    // ストレージの種類を判定して適切に削除
    const fileUrl = file.fileUrl;
    const isRelativePath = !fileUrl.startsWith("http");

    if (isRelativePath) {
      // 相対パスの場合: 直接Supabase Storageから削除
      const { error: deleteError } = await getSupabaseAdmin().storage
        .from(STORAGE_BUCKET)
        .remove([fileUrl]);

      if (deleteError) {
        // ストレージの削除に失敗してもDBからは削除を続行（ログはfileIdのみ）
        console.error(`Storage delete failed for file ID: ${fileIdNum}`);
      }
    } else {
      // フルURLの場合: URLをパースして適切に処理
      // セキュリティ: ホスト検証用の許可リスト
      const allowedVercelBlobHosts = [
        "blob.vercel-storage.com",
        "public.blob.vercel-storage.com",
      ];

      // URLをパースしてホストを検証
      let urlHost: string;
      try {
        urlHost = new URL(fileUrl).host;
      } catch {
        // 無効なURLの場合はストレージ削除をスキップ
        console.error(`Invalid URL for file ID: ${fileIdNum}`);
        urlHost = "";
      }

      // Vercel Blob URL の判定（ホスト検証付き）
      const isVercelBlob = allowedVercelBlobHosts.some((host) => urlHost.endsWith(host));

      // Supabase URL の判定
      const supabaseMatch = fileUrl.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/(.+?)(?:\?|$)/);

      if (isVercelBlob) {
        // Vercel Blobから削除（ホスト検証済み）
        try {
          await del(fileUrl);
        } catch {
          // ストレージの削除に失敗してもDBからは削除を続行
          console.error(`Vercel Blob delete failed for file ID: ${fileIdNum}`);
        }
      } else if (supabaseMatch) {
        // Supabase Storageから削除
        const bucketName = supabaseMatch[1];
        const filePath = decodeURIComponent(supabaseMatch[2]);

        // セキュリティ: バケット名が許可されたものか検証（任意バケット削除攻撃を防止）
        if (bucketName !== STORAGE_BUCKET) {
          // 不正なバケットの場合はストレージ削除をスキップ
          console.error(`Bucket mismatch for file ID: ${fileIdNum}`);
        } else {
          const { error: deleteError } = await getSupabaseAdmin().storage
            .from(STORAGE_BUCKET)
            .remove([filePath]);

          if (deleteError) {
            // ストレージの削除に失敗してもDBからは削除を続行
            console.error(`Supabase delete failed for file ID: ${fileIdNum}`);
          }
        }
      } else {
        console.warn(`Unknown storage type for file ID: ${fileIdNum}`);
      }
    }

    // DBから削除（projectIdも条件に含めてセキュリティ強化）
    await db
      .delete(projectFiles)
      .where(
        and(
          eq(projectFiles.id, fileIdNum),
          eq(projectFiles.projectId, projectId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, "ファイルの削除に失敗しました");
  }
}
