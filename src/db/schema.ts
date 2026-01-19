import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  managementNumber: text("management_number").notNull(),
  manager: text("manager").notNull(),
  client: text("client").notNull(),
  projectNumber: text("project_number").notNull(),
  completionMonth: text("completion_month"), // 完成月（例: 2026-03）
  address: text("address"), // 現地住所
  coordinates: text("coordinates"), // 座標
  landowner: text("landowner"), // 地権者
});

// 進捗テーブル
export const progress = sqliteTable("progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planned"), // planned: 予定, completed: 完了
  createdAt: text("created_at").notNull(), // 予定日
  completedAt: text("completed_at"), // 完了日
});

// コメント（ツイート）テーブル
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Progress = typeof progress.$inferSelect;
export type NewProgress = typeof progress.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

// ユーザーテーブル
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(), // ログインID
  name: text("name"), // 表示名
  password: text("password").notNull(), // ハッシュ化したパスワード
  role: text("role").notNull().default("user"), // user, admin
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;