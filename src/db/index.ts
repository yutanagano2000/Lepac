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
    return (dbInstance as unknown as Record<string, unknown>)[prop as string];
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
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_category_1 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_category_2 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_category_3 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_area_1 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_area_2 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN land_area_3 TEXT`); } catch (e) {}
  // 地権者を3つに拡張（既存のlandownerカラムがある場合はlandowner_1に移行）
  try { await c.execute(`ALTER TABLE projects ADD COLUMN landowner_1 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN landowner_2 TEXT`); } catch (e) {}
  try { await c.execute(`ALTER TABLE projects ADD COLUMN landowner_3 TEXT`); } catch (e) {}
  try { await c.execute(`UPDATE projects SET landowner_1 = landowner WHERE landowner IS NOT NULL AND landowner_1 IS NULL`); } catch (e) {}

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

  await c.execute(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      meeting_date TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT,
      agenda TEXT
    )
  `);

  // 古い名前を新しい名前に統一（重複データのクリーンアップ）
  // 「現地調査」→「現調」、「農転・地目申請」→「法令申請」、「連系（発電開始）」→「連系」
  const legacyTitleMigrations = [
    { oldTitle: "現地調査", newTitle: "現調" },
    { oldTitle: "農転・地目申請", newTitle: "法令申請" },
    { oldTitle: "連系（発電開始）", newTitle: "連系" },
  ];

  for (const { oldTitle, newTitle } of legacyTitleMigrations) {
    // 新しい名前が既に存在するプロジェクトから古い名前のレコードを削除
    try {
      await c.execute(`
        DELETE FROM progress 
        WHERE title = ? 
        AND project_id IN (
          SELECT DISTINCT project_id FROM progress WHERE title = ?
        )
      `, [oldTitle, newTitle]);
    } catch (e) {}

    // 残りの古い名前を新しい名前に変更
    try {
      await c.execute(`UPDATE progress SET title = ? WHERE title = ?`, [newTitle, oldTitle]);
    } catch (e) {}
  }
  
  initialized = true;
}

// 初期化関数をエクスポート
export { initDb };
