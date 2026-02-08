import { describe, it, expect, vi, beforeEach } from "vitest";

// モックデータ
const mockProgress = [
  {
    id: 1,
    projectId: 1,
    title: "現地調査",
    description: "現地確認を行う",
    status: "completed",
    createdAt: "2024-12-01T10:00:00Z",
    completedAt: "2024-12-05T10:00:00Z",
  },
  {
    id: 2,
    projectId: 1,
    title: "書類作成",
    description: null,
    status: "planned",
    createdAt: "2024-12-10T10:00:00Z",
    completedAt: null,
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
          orderBy: vi.fn(() => Promise.resolve(mockProgress)),
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
              Promise.resolve([{ id: 1, ...mockProgress[0], ...data }])
            ),
          })),
        };
      }),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => {
        deletedId = 1;
        return Promise.resolve();
      }),
    })),
  },
}));

vi.mock("@/db/schema", () => ({
  progress: { id: "id", projectId: "projectId", createdAt: "createdAt" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  desc: vi.fn((a) => ({ field: a, order: "desc" })),
}));

import { GET, POST, PATCH, DELETE } from "../route";

// ヘルパー関数
function createMockRequest(options: {
  url?: string;
  method?: string;
  body?: object;
}): Request {
  const url = options.url || "http://localhost/api/projects/1/progress";
  return new Request(url, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("Progress API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedData = null;
    updatedData = null;
    deletedId = null;
  });

  describe("GET /api/projects/[id]/progress", () => {
    it("プロジェクトの進捗一覧を取得する", async () => {
      const request = createMockRequest({});
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it("進捗が日付順で並ぶ", async () => {
      const request = createMockRequest({});
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(data[0].id).toBe(1);
      expect(data[1].id).toBe(2);
    });

    it("進捗にステータスが含まれる", async () => {
      const request = createMockRequest({});
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(data[0]).toHaveProperty("status");
      expect(["planned", "in_progress", "completed"]).toContain(data[0].status);
    });
  });

  describe("POST /api/projects/[id]/progress", () => {
    it("新しい進捗を作成する", async () => {
      const request = createMockRequest({
        method: "POST",
        body: { title: "新規進捗", description: "説明文" },
      });
      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(data).toHaveProperty("id");
      expect(insertedData.title).toBe("新規進捗");
      expect(insertedData.description).toBe("説明文");
    });

    it("プロジェクトIDが正しく設定される", async () => {
      const request = createMockRequest({
        method: "POST",
        body: { title: "テスト" },
      });
      await POST(request, {
        params: Promise.resolve({ id: "5" }),
      });

      expect(insertedData.projectId).toBe(5);
    });

    it("デフォルトステータスがplanned", async () => {
      const request = createMockRequest({
        method: "POST",
        body: { title: "テスト" },
      });
      await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(insertedData.status).toBe("planned");
    });

    it("カスタムステータスを設定できる", async () => {
      const request = createMockRequest({
        method: "POST",
        body: { title: "テスト", status: "in_progress" },
      });
      await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(insertedData.status).toBe("in_progress");
    });

    it("説明がnullでも作成できる", async () => {
      const request = createMockRequest({
        method: "POST",
        body: { title: "テスト" },
      });
      await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(insertedData.description).toBeNull();
    });

    it("作成日時を指定できる", async () => {
      const customDate = "2024-12-15T10:00:00Z";
      const request = createMockRequest({
        method: "POST",
        body: { title: "テスト", createdAt: customDate },
      });
      await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(insertedData.createdAt).toBe(customDate);
    });
  });

  describe("PATCH /api/projects/[id]/progress", () => {
    it("進捗のタイトルを更新する", async () => {
      const request = createMockRequest({
        method: "PATCH",
        body: { progressId: 1, title: "更新されたタイトル" },
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(data).toHaveProperty("id");
      expect(updatedData.title).toBe("更新されたタイトル");
    });

    it("進捗のステータスを更新する", async () => {
      const request = createMockRequest({
        method: "PATCH",
        body: { progressId: 1, status: "completed" },
      });
      await PATCH(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(updatedData.status).toBe("completed");
    });

    it("完了日時を設定できる", async () => {
      const completedAt = "2024-12-20T10:00:00Z";
      const request = createMockRequest({
        method: "PATCH",
        body: { progressId: 1, completedAt },
      });
      await PATCH(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(updatedData.completedAt).toBe(completedAt);
    });

    it("複数フィールドを同時に更新できる", async () => {
      const request = createMockRequest({
        method: "PATCH",
        body: {
          progressId: 1,
          title: "新タイトル",
          description: "新説明",
          status: "completed",
        },
      });
      await PATCH(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(updatedData.title).toBe("新タイトル");
      expect(updatedData.description).toBe("新説明");
      expect(updatedData.status).toBe("completed");
    });
  });

  describe("DELETE /api/projects/[id]/progress", () => {
    it("進捗を削除する", async () => {
      const request = createMockRequest({
        url: "http://localhost/api/projects/1/progress?progressId=1",
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it("progressIdがない場合は400エラー", async () => {
      const request = createMockRequest({
        url: "http://localhost/api/projects/1/progress",
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("progressId is required");
    });
  });

  describe("ステータス遷移", () => {
    it("planned → in_progress", async () => {
      const request = createMockRequest({
        method: "PATCH",
        body: { progressId: 2, status: "in_progress" },
      });
      await PATCH(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(updatedData.status).toBe("in_progress");
    });

    it("in_progress → completed（completedAtも設定）", async () => {
      const completedAt = new Date().toISOString();
      const request = createMockRequest({
        method: "PATCH",
        body: { progressId: 2, status: "completed", completedAt },
      });
      await PATCH(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(updatedData.status).toBe("completed");
      expect(updatedData.completedAt).toBe(completedAt);
    });
  });
});
