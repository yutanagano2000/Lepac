import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { db } from "@/db";
import { projectFiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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

  const files = await db
    .select()
    .from(projectFiles)
    .where(eq(projectFiles.projectId, projectId))
    .orderBy(desc(projectFiles.createdAt));

  return NextResponse.json(files);
}

// ファイルアップロード（FormData形式で受け取り）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
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
        { status: 500 }
      );
    }

    const pathname = `projects/${projectId}/${Date.now()}-${file.name}`;
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "Blob storage not configured" },
        { status: 500 }
      );
    }

    // ファイルの内容を読み取って新しいBlobを作成
    const bytes = await file.arrayBuffer();
    const newBlob = new Blob([bytes], { type: file.type });

    // Vercel Blobにアップロード
    const blob = await put(pathname, newBlob, {
      access: "public",
      token: token,
      addRandomSuffix: false,
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to upload file: ${errorMessage}` },
      { status: 500 }
    );
  }
}
