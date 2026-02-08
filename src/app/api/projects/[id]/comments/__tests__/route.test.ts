import { describe, it, expect, vi, beforeEach } from "vitest";

// モックデータ
const mockComments = [
  {
    id: 1,
    projectId: 1,
    content: "コメント1",
    createdAt: "2024-12-01T10:00:00Z",
    userId: 1,
    userName: "田中太郎",
  },
  {
    id: 2,
    projectId: 1,
    content: "コメント2",
    createdAt: "2024-12-02T10:00:00Z",
    userId: 2,
    userName: "佐藤花子",
  },
];

let insertedData: any = null;
let updatedData: any = null;
let deletedId: number | null = null;

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve(mockComments)),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((data) => {
        insertedData = data;
        return {
          returning: vi.fn(() =>
            Promise.resolve([{ id: 3, ...data }])
          ),
        };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((data) => {
        updatedData = data;
        return {
          where: vi.fn(() => ({
            returning: vi.fn(() =>
              Promise.resolve([{ id: 1, ...mockComments[0], ...data }])
            ),
          })),
        };
      }),
    })),
    delete: vi.fn(() => ({
      where: vi.fn((condition) => {
        deletedId = 1;
        return Promise.resolve();
      }),
    })),
  },
}));

vi.mock("@/db/schema", () => ({
  comments: { id: "id", projectId: "projectId", createdAt: "createdAt" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  desc: vi.fn((a) => ({ field: a, order: "desc" })),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: "1", name: "田中太郎" },
    })
  ),
}));

import { GET, POST, PATCH, DELETE } from "../route";

// ヘルパー関数
function createMockRequest(options: {
  url?: string;
  method?: string;
  body?: object;
}): Request {
  const url = options.url || "http://localhost/api/projects/1/comments";
  return new Request(url, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("Comments API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedData = null;
    updatedData = null;
    deletedId = null;
  });

  describe("GET /api/projects/[id]/comments", () => {
    it("プロジェクトのコメント一覧を取得する", async () => {
      const request = createMockRequest({});
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it("コメントが日付順で並ぶ", async () => {
      const request = createMockRequest({});
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(data[0].id).toBe(1);
      expect(data[1].id).toBe(2);
    });

    it("コメントにユーザー情報が含まれる", async () => {
      const request = createMockRequest({});
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(data[0]).toHaveProperty("userName");
      expect(data[0]).toHaveProperty("userId");
    });
  });

  describe("POST /api/projects/[id]/comments", () => {
    it("新しいコメントを作成する", async () => {
      const request = createMockRequest({
        method: "POST",
        body: { content: "新しいコメント" },
      });
      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(data).toHaveProperty("id");
      expect(insertedData.content).toBe("新しいコメント");
    });

    it("プロジェクトIDが正しく設定される", async () => {
      const request = createMockRequest({
        method: "POST",
        body: { content: "テスト" },
      });
      await POST(request, {
        params: Promise.resolve({ id: "5" }),
      });

      expect(insertedData.projectId).toBe(5);
    });

    it("セッションからユーザー情報が設定される", async () => {
      const request = createMockRequest({
        method: "POST",
        body: { content: "テスト" },
      });
      await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(insertedData.userId).toBe(1);
      expect(insertedData.userName).toBe("田中太郎");
    });

    it("作成日時が設定される", async () => {
      const request = createMockRequest({
        method: "POST",
        body: { content: "テスト" },
      });
      await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(insertedData.createdAt).toBeDefined();
    });
  });

  describe("PATCH /api/projects/[id]/comments", () => {
    it("コメントを更新する", async () => {
      const request = createMockRequest({
        method: "PATCH",
        body: { commentId: 1, content: "更新されたコメント" },
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(data).toHaveProperty("id");
      expect(updatedData.content).toBe("更新されたコメント");
    });
  });

  describe("DELETE /api/projects/[id]/comments", () => {
    it("コメントを削除する", async () => {
      const request = createMockRequest({
        url: "http://localhost/api/projects/1/comments?commentId=1",
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it("commentIdがない場合は400エラー", async () => {
      const request = createMockRequest({
        url: "http://localhost/api/projects/1/comments",
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("commentId is required");
    });
  });
});
