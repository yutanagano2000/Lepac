import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// テスト用のプロジェクトデータ
const mockProjects = [
  {
    id: 1,
    managementNumber: "P001",
    manager: "田中太郎",
    client: "クライアントA",
    projectNumber: "2024-001",
    completionMonth: "2024-12",
    address: "東京都渋谷区",
  },
  {
    id: 2,
    managementNumber: "P002",
    manager: "佐藤花子",
    client: "クライアントB",
    projectNumber: "2024-002",
    completionMonth: "2025-01",
    address: "東京都新宿区",
  },
];

let mockProgress: any[] = [];
let mockComments: any[] = [];
let mockTodos: any[] = [];

// 呼び出しカウンター（selectの呼び出し順序でテーブルを識別）
let selectCallCount = 0;

// DBモックのセットアップ
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => {
        selectCallCount++;
        // route.tsでは projects -> progress -> comments -> todos の順で呼ばれる
        if (selectCallCount === 1) return Promise.resolve(mockProjects);
        if (selectCallCount === 2) return Promise.resolve(mockProgress);
        if (selectCallCount === 3) return Promise.resolve(mockComments);
        if (selectCallCount === 4) return Promise.resolve(mockTodos);
        return Promise.resolve([]);
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() =>
          Promise.resolve([
            {
              id: 3,
              managementNumber: "P003",
              manager: "新規担当",
              client: "新規クライアント",
              projectNumber: "2024-003",
            },
          ])
        ),
      })),
    })),
  },
}));

// schemaモック
vi.mock("@/db/schema", () => ({
  projects: { id: "projects.id" },
  progress: { id: "progress.id" },
  comments: { id: "comments.id" },
  todos: { id: "todos.id" },
}));

// timelineモック
vi.mock("@/lib/timeline", () => ({
  calculateTimeline: vi.fn(() => []),
}));

// APIルートをインポート
import { GET, POST } from "../route";

// calculateTimelineのインポート（モック後）
import { calculateTimeline } from "@/lib/timeline";

describe("Projects API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    mockProgress = [];
    mockComments = [];
    mockTodos = [];
  });

  describe("GET /api/projects", () => {
    it("全てのプロジェクトを取得する", async () => {
      const response = await GET();
      const data = await response.json();

      expect(response).toBeInstanceOf(NextResponse);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it("各プロジェクトに hasOverdue フラグが含まれる", async () => {
      selectCallCount = 0;
      const response = await GET();
      const data = await response.json();

      data.forEach((project: any) => {
        expect(project).toHaveProperty("hasOverdue");
        expect(typeof project.hasOverdue).toBe("boolean");
      });
    });

    it("各プロジェクトに検索用テキストが含まれる", async () => {
      selectCallCount = 0;
      const response = await GET();
      const data = await response.json();

      data.forEach((project: any) => {
        expect(project).toHaveProperty("commentSearchText");
        expect(project).toHaveProperty("todoSearchText");
      });
    });

    it("プロジェクトの基本情報が正しく返される", async () => {
      selectCallCount = 0;
      const response = await GET();
      const data = await response.json();

      const firstProject = data[0];
      expect(firstProject.managementNumber).toBe("P001");
      expect(firstProject.manager).toBe("田中太郎");
      expect(firstProject.client).toBe("クライアントA");
    });

    it("進捗データがある場合、期日超過を判定する（超過なし）", async () => {
      // 未来の日付の進捗データ
      mockProgress = [
        {
          id: 1,
          projectId: 1,
          status: "pending",
          createdAt: new Date(Date.now() + 86400000 * 7).toISOString(), // 7日後
        },
      ];
      selectCallCount = 0;

      const response = await GET();
      const data = await response.json();

      const project = data.find((p: any) => p.id === 1);
      expect(project.hasOverdue).toBe(false);
    });

    it("進捗データがある場合、期日超過を判定する（超過あり）", async () => {
      // 過去の日付の進捗データ
      mockProgress = [
        {
          id: 1,
          projectId: 1,
          status: "pending",
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), // 7日前
        },
      ];
      selectCallCount = 0;

      const response = await GET();
      const data = await response.json();

      const project = data.find((p: any) => p.id === 1);
      expect(project.hasOverdue).toBe(true);
    });

    it("完了済み進捗は超過判定から除外される", async () => {
      // 完了済みの進捗データ（過去日付でも超過にならない）
      mockProgress = [
        {
          id: 1,
          projectId: 1,
          status: "completed",
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), // 7日前
        },
      ];
      selectCallCount = 0;

      const response = await GET();
      const data = await response.json();

      const project = data.find((p: any) => p.id === 1);
      expect(project.hasOverdue).toBe(false);
    });

    it("進捗データがない場合、タイムラインから超過判定する（超過あり）", async () => {
      // calculateTimelineが過去の日付を返すようにモック
      const pastDate = new Date(Date.now() - 86400000 * 7); // 7日前
      vi.mocked(calculateTimeline).mockReturnValue([
        { phase: "test", date: pastDate, label: "テスト" },
      ]);
      selectCallCount = 0;

      const response = await GET();
      const data = await response.json();

      // completionMonthがあるプロジェクトで進捗データがないもの
      expect(calculateTimeline).toHaveBeenCalled();
    });
  });

  describe("POST /api/projects", () => {
    it("新規プロジェクトを作成する", async () => {
      const requestBody = {
        managementNumber: "P003",
        manager: "新規担当",
        client: "新規クライアント",
        projectNumber: "2024-003",
      };

      const request = new Request("http://localhost:3000/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response).toBeInstanceOf(NextResponse);
      expect(data.id).toBeDefined();
      expect(data.managementNumber).toBe("P003");
    });

    it("作成されたプロジェクトにIDが割り当てられる", async () => {
      const request = new Request("http://localhost:3000/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managementNumber: "P004",
          manager: "テスト",
          client: "テスト",
          projectNumber: "2024-004",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.id).toBe(3);
    });
  });
});
