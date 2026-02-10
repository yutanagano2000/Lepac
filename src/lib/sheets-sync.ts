import { google } from "googleapis";
import { db } from "@/db";
import { projects, sheetsSyncLogs } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { buildColumnIndexMap } from "./sheets-column-map";

// ── 型定義 ──

interface SyncResult {
  totalRows: number;
  updatedCount: number;
  insertedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
  durationMs: number;
}

// ── 認証 ──

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY が未設定です");
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

// ── 日付正規化 ──

/**
 * スプレッドシートの日付表現を YYYY-MM-DD に正規化する
 * 対応形式: 2026/3/15, 2026-3-15, 3月15日, 2026年3月15日, R8.3.15, etc.
 * 変換できない値はそのまま返す
 */
function normalizeDate(value: string): string {
  if (!value || typeof value !== "string") return value;
  const v = value.trim();

  // 既に YYYY-MM-DD 形式
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // YYYY/M/D or YYYY-M-D
  const slashMatch = v.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
  if (slashMatch) {
    return `${slashMatch[1]}-${slashMatch[2].padStart(2, "0")}-${slashMatch[3].padStart(2, "0")}`;
  }

  // YYYY年M月D日
  const jpMatch = v.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (jpMatch) {
    return `${jpMatch[1]}-${jpMatch[2].padStart(2, "0")}-${jpMatch[3].padStart(2, "0")}`;
  }

  // M月D日（年なし → 今年を補完）
  const mdMatch = v.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (mdMatch) {
    const year = new Date().getFullYear();
    return `${year}-${mdMatch[1].padStart(2, "0")}-${mdMatch[2].padStart(2, "0")}`;
  }

  // M/D（年なし → 今年を補完）
  const mdSlashMatch = v.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (mdSlashMatch) {
    const year = new Date().getFullYear();
    return `${year}-${mdSlashMatch[1].padStart(2, "0")}-${mdSlashMatch[2].padStart(2, "0")}`;
  }

  return v;
}

/** 日付系カラム名のパターン（末尾が Date, Scheduled, Month, 日付系の名前を含む） */
const DATE_COLUMN_PATTERNS = [
  /Date$/, /Scheduled$/, /Month$/, /Completion$/, /Application$/,
  /completedAt$/, /createdAt$/, /updatedAt$/,
];

function isDateColumn(columnName: string): boolean {
  return DATE_COLUMN_PATTERNS.some((p) => p.test(columnName));
}

// ── メイン同期処理 ──

export async function syncFromSheets(organizationId: number): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    totalRows: 0,
    updatedCount: 0,
    insertedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: [],
    durationMs: 0,
  };

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "一覧";

    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID が未設定です");
    }

    // ヘッダー行（5行目）を取得
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!5:5`,
    });

    const headers = headerRes.data.values?.[0] as string[];
    if (!headers || headers.length === 0) {
      throw new Error("ヘッダー行（5行目）が空です");
    }

    const columnIndexMap = buildColumnIndexMap(headers);

    if (columnIndexMap.size === 0) {
      throw new Error("ヘッダー行からマッピングを構築できませんでした。ヘッダー名を確認してください。");
    }

    // 空ヘッダーだが住所データが入っている列（11列目）を手動マッピング
    if (!columnIndexMap.has(11)) {
      columnIndexMap.set(11, "address");
    }

    // データ行（6行目〜）を取得
    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!6:10000`,
    });

    const rows = dataRes.data.values;
    if (!rows || rows.length === 0) {
      throw new Error("データ行がありません");
    }

    // 管理番号のインデックスを取得
    let managementNumberIdx = -1;
    for (const [idx, col] of columnIndexMap.entries()) {
      if (col === "managementNumber") {
        managementNumberIdx = idx;
        break;
      }
    }
    if (managementNumberIdx === -1) {
      throw new Error("「管理番号」列が見つかりません");
    }

    // データ行を処理
    const dataRows = rows;
    result.totalRows = dataRows.length;

    // N+1 クエリ防止: 管理番号を先に全件収集し、一括でDB検索
    const managementNumbers: string[] = [];
    for (const row of dataRows) {
      const mn = row[managementNumberIdx]?.toString().trim();
      if (mn) managementNumbers.push(mn);
    }

    // 既存プロジェクトを一括取得してマップ化
    const existingMap = new Map<string, number>();
    if (managementNumbers.length > 0) {
      // バッチサイズ 500 で分割クエリ
      const BATCH_SIZE = 500;
      for (let i = 0; i < managementNumbers.length; i += BATCH_SIZE) {
        const batch = managementNumbers.slice(i, i + BATCH_SIZE);
        const existingRows = await db
          .select({ id: projects.id, managementNumber: projects.managementNumber })
          .from(projects)
          .where(
            and(
              inArray(projects.managementNumber, batch),
              eq(projects.organizationId, organizationId)
            )
          );
        for (const row of existingRows) {
          existingMap.set(row.managementNumber, row.id);
        }
      }
    }

    for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
      const row = dataRows[rowIdx];
      try {
        const managementNumber = row[managementNumberIdx]?.toString().trim();

        // 管理番号が空 → スキップ
        if (!managementNumber) {
          result.skippedCount++;
          continue;
        }

        // 行データを DB カラム形式に変換
        const rowData: Record<string, string> = {};
        for (const [colIdx, colName] of columnIndexMap.entries()) {
          if (colName === "managementNumber") continue; // キーは別途扱う
          const cellValue = row[colIdx]?.toString().trim();
          if (!cellValue) continue; // 空セルはスキップ（既存DB値を保持）

          // 日付カラムなら正規化
          rowData[colName] = isDateColumn(colName) ? normalizeDate(cellValue) : cellValue;
        }

        // メモリ上のマップで既存チェック（DBアクセス不要）
        const existingId = existingMap.get(managementNumber);

        if (existingId !== undefined) {
          // UPDATE（値があるフィールドのみ）
          if (Object.keys(rowData).length > 0) {
            await db
              .update(projects)
              .set(rowData as Partial<typeof projects.$inferInsert>)
              .where(eq(projects.id, existingId));
          }
          result.updatedCount++;
        } else {
          // INSERT（必須フィールド補完）
          const insertData: Record<string, unknown> = {
            managementNumber,
            organizationId,
            manager: rowData.manager || "-",
            client: rowData.client || "-",
            projectNumber: rowData.projectNumber || "-",
          };

          // その他のフィールドを追加
          for (const [key, val] of Object.entries(rowData)) {
            if (!(key in insertData)) {
              insertData[key] = val;
            }
          }

          await db.insert(projects).values(insertData as typeof projects.$inferInsert);
          result.insertedCount++;
        }
      } catch (err) {
        result.errorCount++;
        const msg = `行${rowIdx + 2}: ${err instanceof Error ? err.message : String(err)}`;
        if (result.errors.length < 50) {
          result.errors.push(msg);
        }
      }
    }
  } catch (err) {
    result.errorCount++;
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

// ── 同期結果をログテーブルに記録（Drizzle ORM使用） ──

export async function saveSyncLog(result: SyncResult): Promise<void> {
  await db.insert(sheetsSyncLogs).values({
    syncedAt: new Date().toISOString(),
    totalRows: result.totalRows,
    updatedCount: result.updatedCount,
    insertedCount: result.insertedCount,
    skippedCount: result.skippedCount,
    errorCount: result.errorCount,
    errors: JSON.stringify(result.errors),
    durationMs: result.durationMs,
  });
}

// ── 最終同期ステータス取得（Drizzle ORM使用） ──

export async function getLastSyncStatus() {
  const [row] = await db
    .select()
    .from(sheetsSyncLogs)
    .orderBy(desc(sheetsSyncLogs.id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    syncedAt: row.syncedAt,
    totalRows: row.totalRows,
    updatedCount: row.updatedCount,
    insertedCount: row.insertedCount,
    skippedCount: row.skippedCount,
    errorCount: row.errorCount,
    errors: row.errors ? JSON.parse(row.errors) : [],
    durationMs: row.durationMs,
  };
}
