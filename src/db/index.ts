import { createClient, Client } from "@libsql/client";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { runMigrations } from "./migrations";

let client: Client | null = null;
let dbInstance: LibSQLDatabase<typeof schema> | null = null;
let initPromise: Promise<void> | null = null;

function getClient(): Client {
  if (!client) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error("TURSO_DATABASE_URL is not set");
    }
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

function isDbAvailable(): boolean {
  return !!process.env.TURSO_DATABASE_URL;
}

function getDbInstance(): LibSQLDatabase<typeof schema> {
  if (!dbInstance) {
    dbInstance = drizzle(getClient(), { schema });
  }
  return dbInstance;
}

let initError: Error | null = null;

export const db: LibSQLDatabase<typeof schema> = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_, prop) {
    const instance = getDbInstance();
    // マイグレーションをバックグラウンドで実行（初回のみ）
    if (!initPromise) {
      initPromise = initDb().catch((err) => {
        console.error("[DB] Migration error:", err);
        initError = err instanceof Error ? err : new Error(String(err));
        initPromise = null; // 失敗時は再試行可能に
      });
    }
    return (instance as unknown as Record<string, unknown>)[prop as string];
  },
});

// テーブル作成（初回のみ。環境変数未設定時はスキップ）
async function initDb() {
  if (!isDbAvailable()) return;

  const rawClient = getClient();
  await runMigrations(rawClient);
}

/**
 * DB初期化完了を待つ（API routeの先頭で呼ぶことを推奨）
 * マイグレーション完了後にクエリを実行するため
 */
export async function ensureDbReady(): Promise<void> {
  getDbInstance();
  if (!initPromise) {
    initPromise = initDb().catch((err) => {
      console.error("[DB] Migration error:", err);
      initError = err instanceof Error ? err : new Error(String(err));
      initPromise = null;
    });
  }
  await initPromise;
  if (initError) {
    throw new Error(`[DB] Database migration failed: ${initError.message}`);
  }
}

// 初期化関数をエクスポート
export { initDb };
