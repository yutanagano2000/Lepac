import { NextResponse } from "next/server";
import { db } from "@/db";
import { projectFiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { requireProjectAccess } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// ファイル削除
export async function DELETE(
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
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    // URLからファイルパスを抽出
    const urlObj = new URL(file.fileUrl);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/project-files\/(.+)$/);

    if (pathMatch) {
      const filePath = decodeURIComponent(pathMatch[1]);
      // Supabase Storageから削除
      const { error: deleteError } = await getSupabaseAdmin().storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (deleteError) {
        console.error("Supabase delete error:", deleteError);
        // ストレージの削除に失敗してもDBからは削除を続行
      }
    }

    // DBから削除
    await db
      .delete(projectFiles)
      .where(eq(projectFiles.id, fileIdNum));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("File delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
