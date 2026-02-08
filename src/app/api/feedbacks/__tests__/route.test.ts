import { describe, it, expect, vi, beforeEach } from "vitest";

// モックデータ
const mockFeedbacks = [
  {
    id: 1,
    content: "新機能のリクエスト",
    pagePath: "/projects",
    pageTitle: "案件一覧",
    status: "pending",
    likes: 5,
    createdAt: "2024-12-01T10:00:00Z",
    userId: 1,
    userName: "田中太郎",
  },
  {
    id: 2,
    content: "バグ報告",
    pagePath: "/todos",
    pageTitle: "TODO",
    status: "resolved",
    likes: 2,
    createdAt: "2024-12-02T10:00:00Z",
    userId: 2,
    userName: "佐藤花子",
  },
];

let insertedData: any = null;

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        orderBy: vi.fn(() => Promise.resolve(mockFeedbacks)),
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
  },
}));

vi.mock("@/db/schema", () => ({
  feedbacks: { createdAt: "createdAt" },
}));

vi.mock("drizzle-orm", () => ({
  desc: vi.fn((a) => ({ field: a, order: "desc" })),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: "1", name: "田中太郎" },
    })
  ),
}));

import { GET, POST } from "../route";

// ヘルパー関数
function createMockRequest(options: {
  method?: string;
  body?: object;
}): Request {
  return new Request("http://localhost/api/feedbacks", {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("Feedbacks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedData = null;
  });

  describe("GET /api/feedbacks", () => {
    it("要望一覧を取得する", async () => {
      const response = await GET();
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it("要望が日付順で並ぶ", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data[0].id).toBe(1);
      expect(data[1].id).toBe(2);
    });

    it("要望にすべてのフィールドが含まれる", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data[0]).toHaveProperty("id");
      expect(data[0]).toHaveProperty("content");
      expect(data[0]).toHaveProperty("pagePath");
      expect(data[0]).toHaveProperty("status");
      expect(data[0]).toHaveProperty("likes");
      expect(data[0]).toHaveProperty("userName");
    });
  });

  describe("POST /api/feedbacks", () => {
    it("新しい要望を作成する", async () => {
      const request = createMockRequest({
        method: "POST",
        body: {
          content: "新機能リクエスト",
          pagePath: "/projects",
          pageTitle: "案件一覧",
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty("id");
      expect(insertedData.content).toBe("新機能リクエスト");
    });

    it("contentがない場合は400エラー", async () => {
      const request = createMockRequest({
        method: "POST",
        body: {
          pagePath: "/projects",
        },
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Content and pagePath are required");
    });

    it("pagePathがない場合は400エラー", async () => {
      const request = createMockRequest({
        method: "POST",
        body: {
          content: "テスト",
        },
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("デフォルトステータスがpending", async () => {
      const request = createMockRequest({
        method: "POST",
        body: {
          content: "テスト",
          pagePath: "/test",
        },
      });
      await POST(request);

      expect(insertedData.status).toBe("pending");
    });

    it("デフォルトlikesが0", async () => {
      const request = createMockRequest({
        method: "POST",
        body: {
          content: "テスト",
          pagePath: "/test",
        },
      });
      await POST(request);

      expect(insertedData.likes).toBe(0);
    });

    it("セッションからユーザー情報が設定される", async () => {
      const request = createMockRequest({
        method: "POST",
        body: {
          content: "テスト",
          pagePath: "/test",
        },
      });
      await POST(request);

      expect(insertedData.userId).toBe(1);
      expect(insertedData.userName).toBe("田中太郎");
    });

    it("pageTitleがオプショナル", async () => {
      const request = createMockRequest({
        method: "POST",
        body: {
          content: "テスト",
          pagePath: "/test",
        },
      });
      await POST(request);

      expect(insertedData.pageTitle).toBeNull();
    });

    it("作成日時が設定される", async () => {
      const request = createMockRequest({
        method: "POST",
        body: {
          content: "テスト",
          pagePath: "/test",
        },
      });
      await POST(request);

      expect(insertedData.createdAt).toBeDefined();
    });
  });

  describe("ステータス", () => {
    it("pendingステータスの要望が取得できる", async () => {
      const response = await GET();
      const data = await response.json();
      const pending = data.filter((f: any) => f.status === "pending");

      expect(pending.length).toBeGreaterThan(0);
    });

    it("resolvedステータスの要望が取得できる", async () => {
      const response = await GET();
      const data = await response.json();
      const resolved = data.filter((f: any) => f.status === "resolved");

      expect(resolved.length).toBeGreaterThan(0);
    });
  });
});
