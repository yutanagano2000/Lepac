import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// 今日の日付を基準にテストデータを生成
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayStr = today.toISOString().split("T")[0];

const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split("T")[0];

const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split("T")[0];

const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 5);
const nextWeekStr = nextWeek.toISOString().split("T")[0];

const mockProjects = [
  { id: 1, managementNumber: "P001", client: "クライアントA" },
  { id: 2, managementNumber: "P002", client: "クライアントB" },
  { id: 3, managementNumber: "P003", client: "クライアントC" },
];

const mockProgress = [
  { id: 1, projectId: 1, title: "合意書", status: "completed", completedAt: "2024-12-01", createdAt: "2024-12-01" },
  { id: 2, projectId: 1, title: "案件提出", status: "pending", completedAt: null, createdAt: yesterdayStr },
  { id: 3, projectId: 2, title: "完工", status: "completed", completedAt: "2024-12-01", createdAt: "2024-12-01" },
];

const mockTodos = [
  { id: 1, content: "超過タスク", dueDate: yesterdayStr, completedAt: null, projectId: 1 },
  { id: 2, content: "今日のタスク", dueDate: todayStr, completedAt: null, projectId: 1 },
  { id: 3, content: "今週のタスク", dueDate: nextWeekStr, completedAt: null, projectId: 2 },
  { id: 4, content: "完了タスク", dueDate: todayStr, completedAt: "2024-12-05", projectId: 1 },
];

let selectCallCount = 0;

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => {
        selectCallCount++;
        if (selectCallCount === 1) return Promise.resolve(mockProjects);
        if (selectCallCount === 2) return Promise.resolve(mockProgress);
        if (selectCallCount === 3) return Promise.resolve(mockTodos);
        return Promise.resolve([]);
      }),
    })),
  },
}));

vi.mock("@/db/schema", () => ({
  projects: { id: "id" },
  progress: { id: "id" },
  todos: { id: "id" },
}));

import { GET } from "../route";

describe("Dashboard API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
  });

  describe("GET /api/dashboard", () => {
    it("ダッシュボードデータを返す", async () => {
      const response = await GET();
      const data = await response.json();

      expect(response).toBeInstanceOf(NextResponse);
      expect(data).toHaveProperty("overdueTodos");
      expect(data).toHaveProperty("todayTodos");
      expect(data).toHaveProperty("thisWeekTodos");
      expect(data).toHaveProperty("projectAlerts");
      expect(data).toHaveProperty("activeProjects");
      expect(data).toHaveProperty("recentProjects");
    });

    it("期日超過TODOの件数とアイテムを返す", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.overdueTodos).toHaveProperty("count");
      expect(data.overdueTodos).toHaveProperty("items");
      expect(Array.isArray(data.overdueTodos.items)).toBe(true);
    });

    it("今日期日のTODOを返す", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.todayTodos).toHaveProperty("count");
      expect(data.todayTodos).toHaveProperty("items");
    });

    it("今週期日のTODOを返す", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.thisWeekTodos).toHaveProperty("count");
      expect(data.thisWeekTodos).toHaveProperty("items");
    });

    it("案件アラートを返す", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.projectAlerts).toHaveProperty("count");
      expect(data.projectAlerts).toHaveProperty("totalAlerts");
      expect(data.projectAlerts).toHaveProperty("items");
    });

    it("進行中案件を返す", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.activeProjects).toHaveProperty("count");
      expect(data.activeProjects).toHaveProperty("items");
      expect(Array.isArray(data.activeProjects.items)).toBe(true);
    });

    it("最近の案件を返す", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.recentProjects).toHaveProperty("items");
      expect(Array.isArray(data.recentProjects.items)).toBe(true);
    });

    it("TODOアイテムに必要なフィールドが含まれる", async () => {
      const response = await GET();
      const data = await response.json();

      if (data.overdueTodos.items.length > 0) {
        const item = data.overdueTodos.items[0];
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("content");
        expect(item).toHaveProperty("dueDate");
        expect(item).toHaveProperty("projectId");
        expect(item).toHaveProperty("managementNumber");
      }
    });

    it("アクティブ案件アイテムに必要なフィールドが含まれる", async () => {
      const response = await GET();
      const data = await response.json();

      if (data.activeProjects.items.length > 0) {
        const item = data.activeProjects.items[0];
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("managementNumber");
        expect(item).toHaveProperty("client");
      }
    });

    it("完了済みTODOは超過TODOに含まれない", async () => {
      const response = await GET();
      const data = await response.json();

      // 完了タスクは超過に含まれない
      const overdueIds = data.overdueTodos.items.map((t: any) => t.id);
      expect(overdueIds).not.toContain(4); // 完了タスクのID
    });

    it("完工済み案件は進行中に含まれない", async () => {
      const response = await GET();
      const data = await response.json();

      // P002は完工済み
      const activeIds = data.activeProjects.items.map((p: any) => p.id);
      expect(activeIds).not.toContain(2);
    });
  });

  describe("パフォーマンス", () => {
    it("各リストが5件以下に制限される", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.overdueTodos.items.length).toBeLessThanOrEqual(5);
      expect(data.todayTodos.items.length).toBeLessThanOrEqual(5);
      expect(data.thisWeekTodos.items.length).toBeLessThanOrEqual(5);
      expect(data.projectAlerts.items.length).toBeLessThanOrEqual(5);
      expect(data.activeProjects.items.length).toBeLessThanOrEqual(5);
      expect(data.recentProjects.items.length).toBeLessThanOrEqual(5);
    });
  });
});
