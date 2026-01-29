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
  landowner1: text("landowner_1"), // 地権者1
  landowner2: text("landowner_2"), // 地権者2
  landowner3: text("landowner_3"), // 地権者3
  landCategory1: text("land_category_1"), // 地目1（山林・原野・畑）
  landCategory2: text("land_category_2"), // 地目2（山林・原野・畑）
  landCategory3: text("land_category_3"), // 地目3（山林・原野・畑）
  landArea1: text("land_area_1"), // 土地面積1
  landArea2: text("land_area_2"), // 土地面積2
  landArea3: text("land_area_3"), // 土地面積3
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

// TODOテーブル（案件ごと・期日付きリマインダー、ダッシュボード表示用）
export const todos = sqliteTable("todos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  content: text("content").notNull(),
  dueDate: text("due_date").notNull(), // この日までに行う（YYYY-MM-DD）
  createdAt: text("created_at").notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Progress = typeof progress.$inferSelect;
export type NewProgress = typeof progress.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

// 会議（議事録）テーブル
export const meetings = sqliteTable("meetings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(), // タイトル（どんな会議だったか）
  meetingDate: text("meeting_date").notNull(), // 日付（YYYY-MM-DD）
  category: text("category").notNull(), // 種別（社内 / 社外）
  content: text("content"), // 議事録本文（長文）
  agenda: text("agenda"), // 議題（今後検索用）
});

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;

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