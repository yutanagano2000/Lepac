import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { constructionPhotos, CONSTRUCTION_PHOTO_CATEGORIES } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/auth-guard";
import crypto from "crypto";
import path from "path";

// 文字列サニタイズ（XSS対策）
function sanitizeString(str: string | null, maxLength: number = 500): string | null {
  if (!str) return null;
  return str
    .slice(0, maxLength)
    .replace(/[<>]/g, "")  // HTMLタグ除去
    .trim();
}

// ファイル名サニタイズ（パストラバーサル対策）
function sanitizeFileName(fileName: string): string {
  // パス区切り文字を除去し、ファイル名のみ取得
  const baseName = path.basename(fileName);
  // 危険な文字を除去
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  // 長さ制限
  const maxLength = 100;
  if (sanitized.length > maxLength) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext).slice(0, maxLength - ext.length);
    return name + ext;
  }
  return sanitized;
}

export const dynamic = "force-dynamic";

// 工事写真一覧取得
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

  const photos = await db
    .select()
    .from(constructionPhotos)
    .where(eq(constructionPhotos.projectId, projectId))
    .orderBy(desc(constructionPhotos.createdAt));

  return NextResponse.json(photos);
}

// 工事写真アップロード
export async function POST(
  request: Request,
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

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;
    const contractorName = formData.get("contractorName") as string | null;
    const note = formData.get("note") as string | null;
    const takenAt = formData.get("takenAt") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    // カテゴリのバリデーション
    if (!CONSTRUCTION_PHOTO_CATEGORIES.includes(category as typeof CONSTRUCTION_PHOTO_CATEGORIES[number])) {
      return NextResponse.json(
        { error: `Invalid category. Allowed: ${CONSTRUCTION_PHOTO_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    // ファイルタイプのバリデーション（画像のみ）
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "image/heif",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Allowed: JPG, PNG, GIF, WebP, HEIC" },
        { status: 400 }
      );
    }

    // ファイルサイズ制限（20MB - 工事写真は大きめを許容）
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 20MB" },
        { status: 400 }
      );
    }

    // セキュアなファイル名生成（パストラバーサル対策）
    const safeFileName = sanitizeFileName(file.name);
    const uniqueId = crypto.randomBytes(8).toString("hex");
    const pathname = `projects/${projectId}/construction/${Date.now()}-${uniqueId}-${safeFileName}`;
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

    // 入力値サニタイズ
    const sanitizedContractorName = sanitizeString(contractorName, 100);
    const sanitizedNote = sanitizeString(note, 1000);
    const sanitizedTakenAt = takenAt ? takenAt.slice(0, 30) : null;

    // DBに保存
    const [result] = await db
      .insert(constructionPhotos)
      .values({
        projectId,
        category,
        fileName: safeFileName,
        fileUrl: blob.url,
        fileType: file.type,
        fileSize: file.size,
        contractorName: sanitizedContractorName,
        note: sanitizedNote,
        takenAt: sanitizedTakenAt,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Construction photo upload error:", error);
    // 情報漏洩防止：詳細エラーはログのみ、クライアントには一般メッセージ
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}
