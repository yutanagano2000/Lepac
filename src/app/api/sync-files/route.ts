import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db, ensureDbReady } from "@/db";
import { serverFolders, serverFiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * CRON_SECRET Bearer token 認証
 */
function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!authHeader || !cronSecret) return false;
  const expected = `Bearer ${cronSecret}`;
  if (authHeader.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(authHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// リクエストボディ型定義
interface SyncFileEntry {
  name: string;
  path: string;
  size?: number;
  modifiedAt?: string;
}

interface SyncSubfolder {
  key: string;
  name: string;
  path: string;
  files: SyncFileEntry[];
}

interface SyncFolder {
  managementNumber: string;
  folderName: string;
  folderPath: string;
  subfolders: SyncSubfolder[];
}

interface SyncRequestBody {
  folders: SyncFolder[];
}

/**
 * POST /api/sync-files
 * バッチスクリプトからファイルサーバー情報を受信し、DBに保存
 */
export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDbReady();

  let body: SyncRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.folders || !Array.isArray(body.folders)) {
    return NextResponse.json({ error: "Missing folders array" }, { status: 400 });
  }

  const now = new Date().toISOString();
  let foldersProcessed = 0;
  let filesProcessed = 0;
  const errors: string[] = [];

  for (const folder of body.folders) {
    if (!folder.managementNumber || !folder.folderName || !folder.folderPath) {
      errors.push(`Invalid folder entry: ${JSON.stringify(folder).slice(0, 100)}`);
      continue;
    }

    try {
      // フォルダ UPSERT: 既存削除 → 再挿入
      await db.delete(serverFolders).where(
        eq(serverFolders.managementNumber, folder.managementNumber)
      );
      await db.insert(serverFolders).values({
        managementNumber: folder.managementNumber,
        folderName: folder.folderName,
        folderPath: folder.folderPath,
        syncedAt: now,
      });
      foldersProcessed++;

      // ファイル UPSERT: 管理番号単位で全削除 → 再挿入
      await db.delete(serverFiles).where(
        eq(serverFiles.managementNumber, folder.managementNumber)
      );

      // サブフォルダごとにファイルを挿入
      if (folder.subfolders && Array.isArray(folder.subfolders)) {
        for (const sub of folder.subfolders) {
          if (sub.files && Array.isArray(sub.files)) {
            for (const file of sub.files) {
              await db.insert(serverFiles).values({
                managementNumber: folder.managementNumber,
                subfolderKey: sub.key || null,
                fileName: file.name,
                filePath: file.path,
                fileSize: file.size || 0,
                fileModifiedAt: file.modifiedAt || null,
                syncedAt: now,
              });
              filesProcessed++;
            }
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Error processing ${folder.managementNumber}: ${msg}`);
    }
  }

  return NextResponse.json({
    success: true,
    foldersProcessed,
    filesProcessed,
    errorCount: errors.length,
    errors: errors.length > 0 ? errors : undefined,
    syncedAt: now,
  });
}
