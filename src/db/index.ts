import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("./lepac.db");
export const db = drizzle(sqlite, { schema });

// テーブル作成（初回のみ）
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    management_number TEXT NOT NULL,
    manager TEXT NOT NULL,
    client TEXT NOT NULL,
    project_number TEXT NOT NULL
  )
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`);

// 既存テーブルにstatusカラムがない場合は追加
try {
  sqlite.exec(`ALTER TABLE progress ADD COLUMN status TEXT NOT NULL DEFAULT 'planned'`);
} catch {
  // カラムが既に存在する場合はエラーを無視
}

// 既存テーブルにcompletion_monthカラムがない場合は追加
try {
  sqlite.exec(`ALTER TABLE projects ADD COLUMN completion_month TEXT`);
} catch {
  // カラムが既に存在する場合はエラーを無視
}
