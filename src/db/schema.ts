import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  managementNumber: text("management_number").notNull(),
  manager: text("manager").notNull(),
  client: text("client").notNull(),
  projectNumber: text("project_number").notNull(),
  completionMonth: text("completion_month"), // 完成月（例: 2026-03）
});

// 進捗テーブル
export const progress = sqliteTable("progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planned"), // planned: 予定, completed: 完了
  createdAt: text("created_at").notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Progress = typeof progress.$inferSelect;
export type NewProgress = typeof progress.$inferInsert;