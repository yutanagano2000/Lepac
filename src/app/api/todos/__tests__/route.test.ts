import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// テスト用のTODOデータ
const mockTodos = [
  {
    id: 1,
    projectId: 1,
    content: "現地調査を実施する",
    dueDate: "2024-12-15",
    createdAt: "2024-12-01T00:00:00.000Z",
    completedAt: null,
    completedMemo: null,
    userId: 1,
    userName: "田中太郎",
    managementNumber: "P001",
  },
  {
    id: 2,
    projectId: null,
    content: "書類を準備する",
    dueDate: "2024-12-20",
    createdAt: "2024-12-02T00:00:00.000Z",
    completedAt: "2024-12-10T00:00:00.000Z",
    completedMemo: "完了しました",
    userId: 2,
    userName: "佐藤花子",
    managementNumber: null,
  },
];

let insertedTodo: any = null;

// DBモックのセットアップ
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve(mockTodos)),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((data: any) => ({
        returning: vi.fn(() => {
          insertedTodo = {
            id: 3,
            ...data,
          };
          return Promise.resolve([insertedTodo]);
        }),
      })),
    })),
  },
}));

// drizzle-ormのモック
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field: any, value: any) => ({ field, value })),
  asc: vi.fn((field: any) => ({ field, direction: "asc" })),
}));

// authモック用の変数
let mockSession: any = {
  user: {
    id: "1",
    name: "テストユーザー",
    username: "testuser",
  },
};

// authモック
vi.mock("@/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

// APIルートをインポート
import { GET, POST } from "../route";

describe("Todos API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedTodo = null;
    mockSession = {
      user: {
        id: "1",
        name: "テストユーザー",
        username: "testuser",
      },
    };
  });

  describe("GET /api/todos", () => {
    it("全てのTODOを取得する", async () => {
      const response = await GET();
      const data = await response.json();

      expect(response).toBeInstanceOf(NextResponse);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it("TODOに期限日が含まれる", async () => {
      const response = await GET();
      const data = await response.json();

      data.forEach((todo: any) => {
        expect(todo).toHaveProperty("dueDate");
      });
    });

    it("TODOに完了状態が含まれる", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data[0].completedAt).toBeNull();
      expect(data[1].completedAt).not.toBeNull();
    });

    it("案件に紐づくTODOには管理番号が含まれる", async () => {
      const response = await GET();
      const data = await response.json();

      const projectTodo = data.find((t: any) => t.projectId !== null);
      expect(projectTodo.managementNumber).toBe("P001");
    });

    it("案件に紐づかないTODOの管理番号はnull", async () => {
      const response = await GET();
      const data = await response.json();

      const plainTodo = data.find((t: any) => t.projectId === null);
      expect(plainTodo.managementNumber).toBeNull();
    });
  });

  describe("POST /api/todos", () => {
    it("新規TODOを作成する", async () => {
      const requestBody = {
        content: "新しいタスク",
        dueDate: "2024-12-25",
      };

      const request = new Request("http://localhost:3000/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response).toBeInstanceOf(NextResponse);
      expect(data.id).toBeDefined();
      expect(data.content).toBe("新しいタスク");
      expect(data.dueDate).toBe("2024-12-25");
    });

    it("作成されたTODOはprojectIdがnull（案件に紐づかない）", async () => {
      const request = new Request("http://localhost:3000/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "プレーンタスク",
          dueDate: "2024-12-30",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.projectId).toBeNull();
    });

    it("認証済みユーザーの情報がTODOに記録される", async () => {
      const request = new Request("http://localhost:3000/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "認証済みタスク",
          dueDate: "2024-12-31",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.userId).toBe(1);
      expect(data.userName).toBe("テストユーザー");
    });

    it("contentが空の場合は400エラーを返す", async () => {
      const request = new Request("http://localhost:3000/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "",
          dueDate: "2024-12-25",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("dueDateが空の場合は400エラーを返す", async () => {
      const request = new Request("http://localhost:3000/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "タスク内容",
          dueDate: "",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("contentとdueDateの両方がない場合は400エラーを返す", async () => {
      const request = new Request("http://localhost:3000/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
