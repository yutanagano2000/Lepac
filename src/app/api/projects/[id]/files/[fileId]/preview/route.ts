import { NextResponse } from "next/server";
import { db } from "@/db";
import { projectFiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { ApiError, createErrorResponse } from "@/lib/api-error";
import { requireProjectAccess } from "@/lib/auth-guard";

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

    // ファイルパスまたはURLを処理
    // パターン1: 相対パス（projects/...）の場合 - 直接Supabase Storageから取得
    // パターン2: フルURL（https://...）の場合 - URLをパースして処理
    let arrayBuffer: ArrayBuffer;

    const isRelativePath = !file.fileUrl.startsWith("http");

    if (isRelativePath) {
      // 相対パスの場合: 直接Supabase Storageからダウンロード
      const { data, error } = await getSupabaseAdmin().storage
        .from(STORAGE_BUCKET)
        .download(file.fileUrl);

      if (error || !data) {
        throw ApiError.internal(
          "ファイルの読み込みに失敗しました",
          `Failed to download file: ${error?.message}`
        );
      }
      arrayBuffer = await data.arrayBuffer();
    } else {
      // フルURLの場合: URLをパースして適切に処理
      const urlObj = new URL(file.fileUrl);
      // signed URLまたはpublic URLの両方に対応
      const bucketPattern = new RegExp(
        `\\/storage\\/v1\\/object\\/(?:sign|public)\\/${STORAGE_BUCKET}\\/(.+)$`
      );
      const pathMatch = urlObj.pathname.match(bucketPattern);

      if (!pathMatch) {
        // Vercel Blob等の場合 - プロキシ経由で配信（リダイレクトせず認証を維持）
        const allowedHosts = [
          "blob.vercel-storage.com",
          "public.blob.vercel-storage.com",
        ];
        const supabaseUrl = process.env.SUPABASE_URL;
        if (supabaseUrl) {
          try {
            allowedHosts.push(new URL(supabaseUrl).host);
          } catch {
            // 無効なURLは無視
          }
        }

        if (!allowedHosts.some((host) => urlObj.host.endsWith(host))) {
          throw ApiError.badRequest("不正なファイルURLです");
        }

        // プロキシ: ファイルをfetchしてセキュリティヘッダー付きで返す
        const response = await fetch(file.fileUrl);
        if (!response.ok) {
          throw ApiError.internal(
            "ファイルの読み込みに失敗しました",
            `Failed to fetch file: ${response.status}`
          );
        }
        arrayBuffer = await response.arrayBuffer();
      } else {
        // Supabase Storageの場合
        const filePath = decodeURIComponent(pathMatch[1]);
        const { data, error } = await getSupabaseAdmin().storage
          .from(STORAGE_BUCKET)
          .download(filePath);

        if (error || !data) {
          throw ApiError.internal(
            "ファイルの読み込みに失敗しました",
            `Failed to download file: ${error?.message}`
          );
        }
        arrayBuffer = await data.arrayBuffer();
      }
    }

    // セキュリティ: Content-Typeを許可リストで検証（XSS防止）
    const allowedContentTypes: Record<string, string> = {
      "image/jpeg": "image/jpeg",
      "image/png": "image/png",
      "image/gif": "image/gif",
      "image/webp": "image/webp",
      "application/pdf": "application/pdf",
    };

    // 許可されていないタイプは安全なデフォルトにフォールバック
    const safeContentType = allowedContentTypes[file.fileType] || "application/octet-stream";
    const isAllowedInline = safeContentType !== "application/octet-stream";

    // ヘッダーを設定
    const headers: HeadersInit = {
      "Content-Type": safeContentType,
      "Content-Length": String(arrayBuffer.byteLength),
      // 認証が必要なコンテンツは private キャッシュ
      "Cache-Control": "private, max-age=3600",
      // XSS防止: Content-Type スニッフィング無効化
      "X-Content-Type-Options": "nosniff",
    };

    // 許可されたタイプはインライン表示、それ以外はダウンロード
    if (isAllowedInline) {
      headers["Content-Disposition"] = "inline";
    } else {
      headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(file.fileName)}"`;
    }

    return new NextResponse(arrayBuffer, { headers });
  } catch (error) {
    return createErrorResponse(error, "ファイルのプレビューに失敗しました");
  }
}
