"use server";

import { db } from "@/db";
import { projectFiles, projects } from "@/db/schema";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// ファイルシグネチャ（マジックバイト）検証用
// WebPは特別処理が必要なため別途定義
const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

// WebP検証: RIFF (bytes 0-3) + WEBP (bytes 8-11) の両方をチェック
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50]; // "WEBP"

/**
 * ファイルシグネチャを検証
 * WebPは特別処理: RIFF + WEBP の両方を検証（WAVなど他のRIFFファイルを除外）
 */
function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  // WebPは特別処理: RIFF (0-3) + WEBP (8-11) の両方をチェック
  if (mimeType === "image/webp") {
    if (buffer.length < 12) return false;
    const hasRiff = WEBP_RIFF.every((byte, i) => buffer[i] === byte);
    const hasWebp = WEBP_MARKER.every((byte, i) => buffer[8 + i] === byte);
    return hasRiff && hasWebp;
  }

  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) return false;

  return signatures.some((sig) =>
    sig.every((byte, index) => buffer[index] === byte)
  );
}

/**
 * ファイル名を安全にサニタイズ
 * - パストラバーサル防止
 * - 特殊文字除去
 * - 長さ制限
 */
function sanitizeFileName(name: string): string {
  // パストラバーサル対策: パス区切り文字を除去
  let safeName = name.replace(/[/\\]/g, "_");

  // ディレクトリトラバーサル対策: .. を除去
  safeName = safeName.replace(/\.\./g, "_");

  // 先頭・末尾のドットを除去（隠しファイル防止）
  safeName = safeName.replace(/^\.+|\.+$/g, "_");

  // 英数字、ドット、ハイフン、アンダースコアのみ許可
  safeName = safeName.replace(/[^a-zA-Z0-9._-]/g, "_");

  // 連続アンダースコアを単一に
  safeName = safeName.replace(/_+/g, "_");

  // 長さ制限（100文字）- 拡張子が長すぎる場合も考慮
  const MAX_LENGTH = 100;
  if (safeName.length > MAX_LENGTH) {
    const lastDot = safeName.lastIndexOf(".");
    if (lastDot > 0) {
      const ext = safeName.slice(lastDot); // .を含む拡張子
      // 拡張子が長すぎる場合は切り詰め（最大10文字）
      const clampedExt = ext.length > 10 ? ext.slice(0, 10) : ext;
      const baseLen = Math.max(1, MAX_LENGTH - clampedExt.length);
      safeName = safeName.slice(0, baseLen) + clampedExt;
    } else {
      safeName = safeName.slice(0, MAX_LENGTH);
    }
  }

  // 空になった場合のフォールバック
  if (!safeName || safeName === "_") {
    safeName = "file";
  }

  return safeName;
}

export async function uploadFile(formData: FormData) {
  // 認証チェック
  const session = await auth();
  if (!session?.user?.organizationId) {
    return { error: "Unauthorized: Please log in" };
  }

  const fileInput = formData.get("file");
  const projectIdStr = formData.get("projectId") as string | null;
  const category = (formData.get("category") as string | null) || "other";

  // ファイル入力の検証
  if (!fileInput || !(fileInput instanceof File)) {
    return { error: "Invalid or missing file" };
  }
  const file = fileInput;

  if (!projectIdStr) {
    return { error: "Missing projectId" };
  }

  const projectId = Number(projectIdStr);
  // Number.isSafeIntegerで Infinity、小数、範囲外の値を拒否
  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    return { error: "Invalid project ID" };
  }

  // プロジェクト所有権チェック
  const [project] = await db
    .select({ organizationId: projects.organizationId })
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project || project.organizationId !== session.user.organizationId) {
    return { error: "Forbidden: You don't have access to this project" };
  }

  // カテゴリのバリデーション
  const allowedCategories = ["registry_copy", "cadastral_map", "drawing", "consent_form", "other"];
  if (!allowedCategories.includes(category)) {
    return { error: "Invalid category" };
  }

  // ファイルタイプのバリデーション（MIMEタイプ）
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];

  if (!allowedTypes.includes(file.type)) {
    return { error: "File type not allowed. Allowed: JPG, PNG, GIF, WebP, PDF" };
  }

  // ファイルサイズ制限（10MB）
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { error: "File too large. Maximum size is 10MB" };
  }

  // 空ファイル拒否（0バイトのファイルは使用不可）
  if (file.size === 0) {
    return { error: "Empty file not allowed" };
  }

  try {
    // シグネチャ検証用にヘッダーバイトのみ先に読み取り（メモリ効率向上）
    // 最大12バイト（WebPの検証に必要な最大長）
    const HEADER_SIZE = 12;
    const headerBlob = file.slice(0, HEADER_SIZE);
    const headerBuffer = Buffer.from(await headerBlob.arrayBuffer());

    // ファイルシグネチャ検証（MIMEタイプ偽装防止）
    if (!validateFileSignature(headerBuffer, file.type)) {
      console.warn(`[Upload] File signature mismatch: claimed ${file.type}`);
      return { error: "File content does not match declared type" };
    }

    // 検証通過後にファイル全体をバッファに変換
    // NOTE: Supabase Storage はストリームアップロードのサポートが限定的なためバッファを使用
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ファイルパスを生成（プロジェクトID/タイムスタンプ-UUID-ファイル名）
    // UUID追加で並行アップロード時の衝突を防止
    const timestamp = Date.now();
    const uniqueId = randomUUID().slice(0, 8);
    const safeName = sanitizeFileName(file.name);
    const filePath = `projects/${projectId}/${timestamp}-${uniqueId}-${safeName}`;

    // Supabase Storageにアップロード
    const { error: uploadError } = await getSupabaseAdmin().storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      // セキュリティ: 内部エラー詳細をクライアントに漏洩させない
      return { error: "Upload failed. Please try again later." };
    }

    // DBに保存（ファイルパスを保存、署名付きURLは都度生成）
    // fileName: サニタイズ済みの安全な名前を保存（XSS/injection防止）
    try {
      const [dbResult] = await db
        .insert(projectFiles)
        .values({
          projectId,
          fileName: safeName, // サニタイズ済みの名前を保存
          fileUrl: filePath, // パスを保存（署名付きURLではなく）
          fileType: file.type,
          fileSize: file.size,
          category,
          createdAt: new Date().toISOString(),
        })
        .returning();

      return { success: true, file: dbResult };
    } catch (dbError) {
      // DB失敗時はアップロード済みファイルを削除（孤児ファイル防止）
      console.error("DB insert failed, cleaning up uploaded file:", dbError);
      try {
        await getSupabaseAdmin().storage.from(STORAGE_BUCKET).remove([filePath]);
      } catch (cleanupError) {
        // クリーンアップ失敗はログのみ（孤児ファイルが残る可能性）
        console.error("Failed to cleanup orphan file:", filePath, cleanupError);
      }
      throw dbError;
    }
  } catch (error) {
    console.error("File upload error:", error);
    // セキュリティ: 内部エラー詳細をクライアントに漏洩させない
    return { error: "Failed to upload. Please try again later." };
  }
}
