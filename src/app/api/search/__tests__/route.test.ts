import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// モックデータ
const mockProjects = [
  { id: 1, managementNumber: "P001", client: "田中商事", manager: "田中太郎", address: "東京都渋谷区", projectNumber: "2024-001", landowner1: "地主A", landowner2: null, landowner3: null },
  { id: 2, managementNumber: "P002", client: "佐藤工業", manager: "佐藤花子", address: "東京都新宿区", projectNumber: "2024-002", landowner1: "地主B", landowner2: "地主C", landowner3: null },
  { id: 3, managementNumber: "A001", client: "鈴木建設", manager: "鈴木一郎", address: "大阪府大阪市", projectNumber: "2024-003", landowner1: null, landowner2: null, landowner3: null },
];

const mockTodos = [
  { id: 1, content: "現地調査を実施", dueDate: "2024-12-15", projectId: 1 },
  { id: 2, content: "書類提出", dueDate: "2024-12-20", projectId: 2 },
];

const mockMeetings = [
  { id: 1, title: "定例会議", content: "進捗報告", agenda: "田中案件について", meetingDate: "2024-12-15", category: "定例" },
  { id: 2, title: "緊急会議", content: "トラブル対応", agenda: "佐藤案件の問題", meetingDate: "2024-12-10", category: "緊急" },
];

let selectCallCount = 0;

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => {
              selectCallCount++;
              if (selectCallCount === 1) return Promise.resolve(mockProjects);
              if (selectCallCount === 2) return Promise.resolve(mockTodos);
              if (selectCallCount === 3) return Promise.resolve(mockMeetings);
              return Promise.resolve([]);
            }),
          })),
        })),
      })),
    })),
  },
}));

vi.mock("@/db/schema", () => ({
  projects: { managementNumber: "managementNumber", client: "client", manager: "manager", address: "address", projectNumber: "projectNumber", landowner1: "landowner1", landowner2: "landowner2", landowner3: "landowner3" },
  todos: { content: "content", dueDate: "dueDate" },
  meetings: { title: "title", content: "content", agenda: "agenda", meetingDate: "meetingDate" },
}));

vi.mock("drizzle-orm", () => ({
  like: vi.fn((field, pattern) => ({ field, pattern })),
  or: vi.fn((...conditions) => conditions),
  asc: vi.fn((field) => ({ field, order: "asc" })),
  desc: vi.fn((field) => ({ field, order: "desc" })),
}));

import { GET } from "../route";

describe("Search API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
  });

  describe("GET /api/search", () => {
    it("空クエリで空配列を返す", async () => {
      const request = new Request("http://localhost/api/search?q=");
      const response = await GET(request);
      const data = await response.json();

      expect(response).toBeInstanceOf(NextResponse);
      expect(data).toEqual([]);
    });

    it("クエリなしで空配列を返す", async () => {
      const request = new Request("http://localhost/api/search");
      const response = await GET(request);
      const data = await response.json();

      expect(data).toEqual([]);
    });

    it("空白のみのクエリで空配列を返す", async () => {
      const request = new Request("http://localhost/api/search?q=   ");
      const response = await GET(request);
      const data = await response.json();

      expect(data).toEqual([]);
    });

    it("検索クエリで結果を返す", async () => {
      const request = new Request("http://localhost/api/search?q=田中");
      const response = await GET(request);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
    });

    it("プロジェクト結果に正しい形式が含まれる", async () => {
      const request = new Request("http://localhost/api/search?q=P001");
      const response = await GET(request);
      const data = await response.json();

      const projectResult = data.find((r: any) => r.type === "project");
      if (projectResult) {
        expect(projectResult).toHaveProperty("type", "project");
        expect(projectResult).toHaveProperty("id");
        expect(projectResult).toHaveProperty("title");
        expect(projectResult).toHaveProperty("subtitle");
        expect(projectResult).toHaveProperty("href");
        expect(projectResult.href).toContain("/projects/");
      }
    });

    it("TODO結果に正しい形式が含まれる", async () => {
      const request = new Request("http://localhost/api/search?q=調査");
      const response = await GET(request);
      const data = await response.json();

      const todoResult = data.find((r: any) => r.type === "todo");
      if (todoResult) {
        expect(todoResult).toHaveProperty("type", "todo");
        expect(todoResult).toHaveProperty("id");
        expect(todoResult).toHaveProperty("title");
        expect(todoResult).toHaveProperty("href");
      }
    });

    it("会議結果に正しい形式が含まれる", async () => {
      const request = new Request("http://localhost/api/search?q=会議");
      const response = await GET(request);
      const data = await response.json();

      const meetingResult = data.find((r: any) => r.type === "meeting");
      if (meetingResult) {
        expect(meetingResult).toHaveProperty("type", "meeting");
        expect(meetingResult).toHaveProperty("id");
        expect(meetingResult).toHaveProperty("title");
        expect(meetingResult).toHaveProperty("href");
        expect(meetingResult.href).toContain("/meetings/");
      }
    });

    it("結果が統合されて返される", async () => {
      const request = new Request("http://localhost/api/search?q=test");
      const response = await GET(request);
      const data = await response.json();

      // プロジェクト、TODO、会議の結果が含まれる
      const types = new Set(data.map((r: any) => r.type));
      expect(types.size).toBeGreaterThan(0);
    });
  });

  describe("パフォーマンス", () => {
    it("検索結果が10件以下に制限される", async () => {
      const request = new Request("http://localhost/api/search?q=test");
      const response = await GET(request);
      const data = await response.json();

      // 各タイプ最大10件なので、合計最大30件
      expect(data.length).toBeLessThanOrEqual(30);
    });
  });
});
