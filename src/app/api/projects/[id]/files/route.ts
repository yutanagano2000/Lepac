import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { projectFiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireProjectAccess, requireProjectAccessWithCsrf } from "@/lib/auth-guard";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// ファイル一覧取得
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  // 認証・組織・プロジェクト所有権チェック
  const authResult = await requireProjectAccess(projectId);
  if (!authResult.success) {
    return authResult.response;
  }

  // ページネーション（デフォルト: 50件、最大100件、負数は0にクランプ）
  const url = new URL(_request.url);
  const rawLimit = Number(url.searchParams.get("limit"));
  const rawOffset = Number(url.searchParams.get("offset"));
  const limit = Math.max(1, Math.min(isNaN(rawLimit) ? 50 : rawLimit, 100));
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

  const files = await db
    .select({
      id: projectFiles.id,
      projectId: projectFiles.projectId,
      fileName: projectFiles.fileName,
      fileType: projectFiles.fileType,
      fileSize: projectFiles.fileSize,
      category: projectFiles.category,
      createdAt: projectFiles.createdAt,
    })
    .from(projectFiles)
    .where(eq(projectFiles.projectId, projectId))
    .orderBy(desc(projectFiles.createdAt))
    .limit(limit)
    .offset(offset);

  // セキュリティ: fileUrlは返さず、preview APIパスを追加
  const filesWithPreviewUrl = files.map((file) => ({
    ...file,
    previewUrl: `/api/projects/${projectId}/files/${file.id}/preview`,
  }));

  return NextResponse.json({
    data: filesWithPreviewUrl,
    pagination: { limit, offset, hasMore: files.length === limit },
  });
}

// ファイルアップロード（FormData形式で受け取り）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  // 認証・組織・プロジェクト所有権 + CSRFチェック
  const authResult = await requireProjectAccessWithCsrf(request, projectId);
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string | null) || "other";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // カテゴリのバリデーション
    const allowedCategories = ["registry_copy", "cadastral_map", "drawing", "consent_form", "other"];
    if (!allowedCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category. Allowed: registry_copy, cadastral_map, drawing, consent_form, other" },
        { status: 400 }
      );
    }

    // ファイルタイプのバリデーション
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Allowed: JPG, PNG, GIF, WebP, PDF" },
        { status: 400 }
      );
    }

    // ファイルサイズ制限（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 413 } // 413 Payload Too Large
      );
    }

    // ファイル名をサニタイズ（特殊文字を除去）
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    // UUIDで衝突を防止
    const uniqueId = randomUUID();
    const pathname = `projects/${projectId}/${uniqueId}-${sanitizedFileName}`;
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "Blob storage not configured" },
        { status: 500 }
      );
    }

    // Vercel Blobにアップロード
    // Note: Vercel Blob "public" は署名付きURLで保護されるため、直接URLを知らないとアクセス不可
    // プロジェクトアクセス制御はDB + preview APIで実施
    const blob = await put(pathname, file, {
      access: "public", // TODO: Vercel Blob proは "private" サポート予定
      token: token,
      addRandomSuffix: true, // 追加の衝突防止
      contentType: file.type,
    });

    // DBに保存
    const [result] = await db
      .insert(projectFiles)
      .values({
        projectId,
        fileName: file.name,
        fileUrl: blob.url,
        fileType: file.type,
        fileSize: file.size,
        category,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(result);
  } catch (error) {
    console.error("File upload error:", error);
    // セキュリティ: 内部エラー詳細をクライアントに公開しない
    return NextResponse.json(
      { error: "ファイルのアップロードに失敗しました" },
      { status: 500 }
    );
  }
}
