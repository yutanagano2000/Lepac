"use server";

import { db } from "@/db";
import { projectFiles } from "@/db/schema";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

export async function uploadFile(formData: FormData) {
  const file = formData.get("file") as File | null;
  const projectIdStr = formData.get("projectId") as string | null;
  const category = (formData.get("category") as string | null) || "other";

  if (!file || !projectIdStr) {
    return { error: "Missing file or projectId" };
  }

  const projectId = Number(projectIdStr);
  if (isNaN(projectId)) {
    return { error: "Invalid project ID" };
  }

  // カテゴリのバリデーション
  const allowedCategories = ["registry_copy", "cadastral_map", "drawing", "consent_form", "other"];
  if (!allowedCategories.includes(category)) {
    return { error: "Invalid category" };
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
    return { error: "File type not allowed. Allowed: JPG, PNG, GIF, WebP, PDF" };
  }

  // ファイルサイズ制限（10MB）
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { error: "File too large. Maximum size is 10MB" };
  }

  try {
    // ファイルパスを生成（プロジェクトID/タイムスタンプ-ファイル名）
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `projects/${projectId}/${timestamp}-${safeName}`;

    console.log("Upload - file.name:", file.name);
    console.log("Upload - file.size:", file.size);
    console.log("Upload - file.type:", file.type);

    // ファイルをバッファに変換（ストリームベースの読み込み）
    const chunks: Uint8Array[] = [];
    const stream = file.stream();
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    // 全チャンクを結合
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const buffer = Buffer.alloc(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    console.log("Upload - buffer.length:", buffer.length);

    // Supabase Storageにアップロード
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return { error: `Upload failed: ${uploadError.message}` };
    }

    // 署名付きURLを生成（1年間有効）
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1年

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      return { error: `Failed to create signed URL: ${signedUrlError.message}` };
    }

    // DBに保存
    const [dbResult] = await db
      .insert(projectFiles)
      .values({
        projectId,
        fileName: file.name,
        fileUrl: signedUrlData.signedUrl,
        fileType: file.type,
        fileSize: file.size,
        category,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return { success: true, file: dbResult };
  } catch (error) {
    console.error("File upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { error: `Failed to upload: ${errorMessage}` };
  }
}
