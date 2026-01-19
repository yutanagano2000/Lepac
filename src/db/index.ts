import { createClient, Client } from "@libsql/client";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

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
    return (dbInstance as Record<string, unknown>)[prop as string];
  },
});

// テーブル作成（初回のみ）
async function initDb() {
  if (initialized) return;
  
  const c = getClient();
  
  await c.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      management_number TEXT NOT NULL,
      manager TEXT NOT NULL,
      client TEXT NOT NULL,
      project_number TEXT NOT NULL,
      completion_month TEXT,
      address TEXT,
      coordinates TEXT,
      landowner TEXT
    )
  `);

  // カラム追加用（既存テーブルへの対応）
  try { await c.execute(`ALTER TABLE projects ADD COLUMN address TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN coordinates TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN landowner TEXT`); } catch (e) {}

  await c.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      name TEXT,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  
  initialized = true;
}

// 初期化関数をエクスポート
export { initDb };
