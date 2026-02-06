import { NextResponse } from "next/server";
import { db } from "@/db";
import { projectFiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { requireProjectAccess } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// ファイルダウンロード用の署名付きURLを生成
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
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // 既存のURLからパスを抽出
  // URLの形式: https://xxx.supabase.co/storage/v1/object/sign/project-files/projects/2/xxx.jpg?token=...
  const urlObj = new URL(file.fileUrl);
  const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/project-files\/(.+)$/);

  if (!pathMatch) {
    // 古い形式のURLの場合はそのままリダイレクト
    return NextResponse.redirect(file.fileUrl);
  }

  const filePath = decodeURIComponent(pathMatch[1]);

  // 新しい署名付きURLを生成（1時間有効）
  const { data, error } = await getSupabaseAdmin().storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, 3600, {
      download: file.fileName, // ダウンロード時のファイル名を指定
    });

  if (error || !data) {
    console.error("Failed to create signed URL:", error);
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }

  // 新しいURLにリダイレクト
  return NextResponse.redirect(data.signedUrl);
}
