import { describe, it, expect, vi, beforeEach } from "vitest";

// モックデータ
const mockMeetings = [
  {
    id: 1,
    title: "定例会議",
    meetingDate: "2024-12-15",
    category: "社内",
    content: "週次報告",
    agenda: "1. 進捗報告\n2. 課題共有",
  },
  {
    id: 2,
    title: "クライアント打ち合わせ",
    meetingDate: "2024-12-20",
    category: "クライアント",
    content: null,
    agenda: null,
  },
];

let insertedData: any = null;

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        orderBy: vi.fn(() => Promise.resolve(mockMeetings)),
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
  meetings: { meetingDate: "meetingDate" },
}));

vi.mock("drizzle-orm", () => ({
  desc: vi.fn((a) => ({ field: a, order: "desc" })),
}));

import { GET, POST } from "../route";

// ヘルパー関数
function createMockRequest(options: {
  method?: string;
  body?: object;
}): Request {
  return new Request("http://localhost/api/meetings", {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("Meetings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedData = null;
  });

  describe("GET /api/meetings", () => {
    it("会議一覧を取得する", async () => {
      const response = await GET();
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it("会議が日付順で並ぶ", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data[0].id).toBe(1);
      expect(data[1].id).toBe(2);
    });

    it("会議にすべてのフィールドが含まれる", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data[0]).toHaveProperty("id");
      expect(data[0]).toHaveProperty("title");
      expect(data[0]).toHaveProperty("meetingDate");
      expect(data[0]).toHaveProperty("category");
      expect(data[0]).toHaveProperty("content");
      expect(data[0]).toHaveProperty("agenda");
    });
  });

  describe("POST /api/meetings", () => {
    it("新しい会議を作成する", async () => {
      const request = createMockRequest({
        method: "POST",
        body: {
          title: "新規会議",
          meetingDate: "2024-12-25",
          category: "社内",
          content: "内容",
          agenda: "議題",
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty("id");
      expect(insertedData.title).toBe("新規会議");
    });

    it("必須フィールドのみで作成できる", async () => {
      const request = createMockRequest({
        method: "POST",
        body: {
          title: "シンプル会議",
          meetingDate: "2024-12-25",
        },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty("id");
      expect(insertedData.content).toBeNull();
      expect(insertedData.agenda).toBeNull();
    });

    it("デフォルトカテゴリが社内", async () => {
      const request = createMockRequest({
        method: "POST",
        body: {
          title: "テスト会議",
          meetingDate: "2024-12-25",
        },
      });
      await POST(request);

      expect(insertedData.category).toBe("社内");
    });

    it("空のタイトルでも作成できる（空文字として）", async () => {
      const request = createMockRequest({
        method: "POST",
        body: {
          meetingDate: "2024-12-25",
        },
      });
      await POST(request);

      expect(insertedData.title).toBe("");
    });

    it("空の日付でも作成できる（空文字として）", async () => {
      const request = createMockRequest({
        method: "POST",
        body: {
          title: "テスト会議",
        },
      });
      await POST(request);

      expect(insertedData.meetingDate).toBe("");
    });
  });

  describe("カテゴリ", () => {
    const categories = ["社内", "クライアント", "外部"];

    categories.forEach((category) => {
      it(`${category}カテゴリで作成できる`, async () => {
        const request = createMockRequest({
          method: "POST",
          body: {
            title: "テスト",
            meetingDate: "2024-12-25",
            category,
          },
        });
        await POST(request);

        expect(insertedData.category).toBe(category);
      });
    });
  });
});
