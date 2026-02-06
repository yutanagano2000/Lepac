import { createClient, Client } from "@libsql/client";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { runMigrations } from "./migrations";

let client: Client | null = null;
let dbInstance: LibSQLDatabase<typeof schema> | null = null;
let initialized = false;

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

export const db: LibSQLDatabase<typeof schema> = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_, prop) {
    if (!dbInstance) {
      initDb(); // 背景で初期化（非同期だが、次は待たれる）
      dbInstance = drizzle(getClient(), { schema });
    }
    return (dbInstance as unknown as Record<string, unknown>)[prop as string];
  },
});

// テーブル作成（初回のみ）
async function initDb() {
  if (initialized) return;

  const rawClient = getClient();
  await runMigrations(rawClient);

  initialized = true;
}

// 初期化関数をエクスポート
export { initDb };
