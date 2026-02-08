import { describe, it, expect, vi, beforeEach } from "vitest";

// 大量のモックデータを生成
const generateLargeDataset = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    managementNumber: `P${(i + 1).toString().padStart(4, "0")}`,
    manager: `担当者${i % 10}`,
    client: `クライアント${i % 20}`,
    projectNumber: `2024-${(i + 1).toString().padStart(4, "0")}`,
    completionMonth: i % 3 === 0 ? "2024-12" : null,
    address: `東京都渋谷区${i}丁目`,
    landowner1: null,
    landowner2: null,
    landowner3: null,
  }));
};

const largeProjectData = generateLargeDataset(1000);
const largeProgressData: any[] = [];
const largeCommentsData: any[] = [];
const largeTodosData: any[] = [];

let selectCallCount = 0;

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => {
        selectCallCount++;
        if (selectCallCount === 1) return Promise.resolve(largeProjectData);
        if (selectCallCount === 2) return Promise.resolve(largeProgressData);
        if (selectCallCount === 3) return Promise.resolve(largeCommentsData);
        if (selectCallCount === 4) return Promise.resolve(largeTodosData);
        return Promise.resolve([]);
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 1001 }])),
      })),
    })),
  },
}));

vi.mock("@/db/schema", () => ({
  projects: { id: "projects.id" },
  progress: { id: "progress.id" },
  comments: { id: "comments.id" },
  todos: { id: "todos.id" },
}));

vi.mock("@/lib/timeline", () => ({
  calculateTimeline: vi.fn(() => []),
}));

import { GET, POST } from "../route";

describe("Performance Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
  });

  describe("レスポンス時間", () => {
    it("GET /api/projects が500ms以内に応答する（1000件）", async () => {
      const start = performance.now();
      const response = await GET();
      const duration = performance.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    it("POST /api/projects が200ms以内に応答する", async () => {
      const request = new Request("http://localhost/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managementNumber: "PERF001",
          manager: "パフォーマンステスト",
        }),
      });

      const start = performance.now();
      const response = await POST(request);
      const duration = performance.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200);
    });
  });

  describe("大量データ処理", () => {
    it("1000件のプロジェクトを正常に処理できる", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.length).toBe(1000);
    });

    it("各プロジェクトにhasOverdueフラグが含まれる", async () => {
      const response = await GET();
      const data = await response.json();

      // サンプルチェック（全件チェックは遅い）
      const sample = data.slice(0, 10);
      sample.forEach((project: any) => {
        expect(project).toHaveProperty("hasOverdue");
        expect(typeof project.hasOverdue).toBe("boolean");
      });
    });

    it("メモリ効率的にデータを返す（JSONサイズ制限）", async () => {
      const response = await GET();
      const text = await response.clone().text();

      // 1000件でも10MB以下であるべき
      expect(text.length).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe("並行リクエスト", () => {
    it("同時10リクエストを処理できる", async () => {
      const requests = Array.from({ length: 10 }, () => {
        selectCallCount = 0; // 各リクエストでリセット
        return GET();
      });

      const start = performance.now();
      const responses = await Promise.all(requests);
      const duration = performance.now() - start;

      // 全て成功
      responses.forEach((res) => {
        expect(res.status).toBe(200);
      });

      // 並行処理なので、直列より速いはず（目安として2秒以内）
      expect(duration).toBeLessThan(2000);
    });
  });

  describe("データ整合性", () => {
    it("大量データでもソート順が維持される", async () => {
      const response = await GET();
      const data = await response.json();

      // 管理番号でソートされているはず（デフォルトの順序）
      // ここではIDの昇順を確認
      for (let i = 1; i < Math.min(100, data.length); i++) {
        expect(data[i].id).toBeGreaterThan(data[i - 1].id);
      }
    });
  });
});

describe("フィルタリングパフォーマンス", () => {
  it("複数条件のフィルタリングが高速に動作する", async () => {
    // useProjectsDataフックでのフィルタリングをシミュレート
    const start = performance.now();

    const filtered = largeProjectData.filter((p) => {
      const matchManager = p.manager.includes("担当者1");
      const matchClient = p.client.includes("クライアント5");
      const matchNumber = p.managementNumber.includes("P00");
      return matchManager || matchClient || matchNumber;
    });

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50); // 50ms以内
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("検索クエリのフィルタリングが高速に動作する", async () => {
    const searchQuery = "渋谷区1";

    const start = performance.now();

    const filtered = largeProjectData.filter((p) => {
      const searchable = [
        p.managementNumber,
        p.manager,
        p.client,
        p.address,
        p.projectNumber,
      ].join(" ").toLowerCase();
      return searchable.includes(searchQuery.toLowerCase());
    });

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // 100ms以内
  });
});
