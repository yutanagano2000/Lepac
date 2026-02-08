import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// テスト用のTODOデータ
const mockTodo = {
  id: 1,
  projectId: 1,
  content: "現地調査を実施する",
  dueDate: "2024-12-15",
  createdAt: "2024-12-01T00:00:00.000Z",
  completedAt: null,
  completedMemo: null,
  userId: 1,
  userName: "田中太郎",
};

let updatedTodo: any = null;
let deletedTodoIds: number[] = [];

// DBモックのセットアップ
vi.mock("@/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn((data: any) => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => {
            updatedTodo = { ...mockTodo, ...data };
            return Promise.resolve([updatedTodo]);
          }),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn((condition: any) => {
        deletedTodoIds.push(1);
        return Promise.resolve();
      }),
    })),
  },
}));

// drizzle-ormのモック
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field: any, value: any) => ({ field, value })),
}));

// APIルートをインポート
import { PATCH, DELETE } from "../route";

describe("Todos [id] API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updatedTodo = null;
    deletedTodoIds = [];
  });

  describe("PATCH /api/todos/:id", () => {
    it("TODOの内容を更新する", async () => {
      const updateData = {
        content: "更新されたタスク内容",
      };

      const request = new Request("http://localhost:3000/api/todos/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const params = Promise.resolve({ id: "1" });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response).toBeInstanceOf(NextResponse);
      expect(data.content).toBe("更新されたタスク内容");
    });

    it("TODOの期限日を更新する", async () => {
      const updateData = {
        dueDate: "2025-01-15",
      };

      const request = new Request("http://localhost:3000/api/todos/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const params = Promise.resolve({ id: "1" });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(data.dueDate).toBe("2025-01-15");
    });

    it("TODOを完了にする", async () => {
      const completedAt = new Date().toISOString();
      const updateData = {
        completedAt,
        completedMemo: "タスク完了しました",
      };

      const request = new Request("http://localhost:3000/api/todos/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const params = Promise.resolve({ id: "1" });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(data.completedAt).toBe(completedAt);
      expect(data.completedMemo).toBe("タスク完了しました");
    });

    it("TODOの完了を取り消す", async () => {
      const updateData = {
        completedAt: null,
        completedMemo: null,
      };

      const request = new Request("http://localhost:3000/api/todos/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const params = Promise.resolve({ id: "1" });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(data.completedAt).toBeNull();
      expect(data.completedMemo).toBeNull();
    });

    it("無効なIDの場合は400エラーを返す", async () => {
      const request = new Request("http://localhost:3000/api/todos/invalid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "test" }),
      });
      const params = Promise.resolve({ id: "invalid" });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid");
    });

    it("更新フィールドがない場合は400エラーを返す", async () => {
      const request = new Request("http://localhost:3000/api/todos/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const params = Promise.resolve({ id: "1" });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("No fields");
    });

    it("contentを空文字に更新しようとすると400エラーを返す", async () => {
      const request = new Request("http://localhost:3000/api/todos/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      });
      const params = Promise.resolve({ id: "1" });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("empty");
    });

    it("dueDateを空文字に更新しようとすると400エラーを返す", async () => {
      const request = new Request("http://localhost:3000/api/todos/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: "" }),
      });
      const params = Promise.resolve({ id: "1" });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("複数のフィールドを同時に更新できる", async () => {
      const updateData = {
        content: "更新されたタスク",
        dueDate: "2025-02-01",
      };

      const request = new Request("http://localhost:3000/api/todos/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const params = Promise.resolve({ id: "1" });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(data.content).toBe("更新されたタスク");
      expect(data.dueDate).toBe("2025-02-01");
    });
  });

  describe("DELETE /api/todos/:id", () => {
    it("TODOを削除する", async () => {
      const request = new Request("http://localhost:3000/api/todos/1", {
        method: "DELETE",
      });
      const params = Promise.resolve({ id: "1" });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response).toBeInstanceOf(NextResponse);
      expect(data.success).toBe(true);
    });

    it("削除操作が実行される", async () => {
      const request = new Request("http://localhost:3000/api/todos/1", {
        method: "DELETE",
      });
      const params = Promise.resolve({ id: "1" });

      await DELETE(request, { params });

      expect(deletedTodoIds.length).toBeGreaterThan(0);
    });

    it("無効なIDの場合は400エラーを返す", async () => {
      const request = new Request("http://localhost:3000/api/todos/invalid", {
        method: "DELETE",
      });
      const params = Promise.resolve({ id: "invalid" });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid");
    });
  });
});
