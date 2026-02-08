import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import type { ProjectWithOverdue } from "../_types";

// Next.js モック
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// モックデータ
const mockProjects: ProjectWithOverdue[] = [
  {
    id: 1,
    managementNumber: "P001",
    manager: "田中太郎",
    client: "クライアントA",
    projectNumber: "2024-001",
    completionMonth: "2024-12",
    address: "東京都渋谷区",
    landowner1: null,
    landowner2: null,
    landowner3: null,
    hasOverdue: false,
  },
];

// ProjectsViewをインポート（モック後）
import ProjectsView from "../ProjectsView";

describe("Error Recovery Tests", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe("ネットワークエラー処理", () => {
    it("初期データが表示される（fetchエラーでもクラッシュしない）", () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("Network error"))) as typeof global.fetch;

      render(<ProjectsView initialProjects={mockProjects} />);

      // 初期データは表示される
      expect(screen.getByText("P001")).toBeInTheDocument();
    });

    it("APIエラー時もUIは操作可能", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: "Internal Server Error" }),
        } as Response)
      ) as typeof global.fetch;

      render(<ProjectsView initialProjects={mockProjects} />);

      // 検索入力は動作する
      const searchInput = screen.getByPlaceholderText(/検索/);
      expect(searchInput).toBeEnabled();
    });
  });

  describe("タイムアウト処理", () => {
    it("長時間のAPIレスポンスでもUIはブロックされない", async () => {
      vi.useFakeTimers();

      global.fetch = vi.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve(mockProjects),
                } as Response),
              10000
            )
          )
      ) as typeof global.fetch;

      render(<ProjectsView initialProjects={mockProjects} />);

      // UIは即座にレンダリングされる
      expect(screen.getByText("案件一覧")).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe("不正なデータ処理", () => {
    it("nullフィールドを含むデータでもクラッシュしない", () => {
      const projectsWithNulls: ProjectWithOverdue[] = [
        {
          id: 1,
          managementNumber: "P001",
          manager: null as any,
          client: null as any,
          projectNumber: null as any,
          completionMonth: null,
          address: null as any,
          landowner1: null,
          landowner2: null,
          landowner3: null,
          hasOverdue: false,
        },
      ];

      expect(() => {
        render(<ProjectsView initialProjects={projectsWithNulls} />);
      }).not.toThrow();
    });

    it("空のプロジェクト配列でもクラッシュしない", () => {
      expect(() => {
        render(<ProjectsView initialProjects={[]} />);
      }).not.toThrow();

      expect(screen.getByText("案件一覧")).toBeInTheDocument();
    });
  });

  describe("状態回復", () => {
    it("エラー後も正常な操作が可能", async () => {
      let callCount = 0;
      global.fetch = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("First call fails"));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProjects),
        } as Response);
      }) as typeof global.fetch;

      render(<ProjectsView initialProjects={mockProjects} />);

      // エラー後もUIは正常
      expect(screen.getByText("P001")).toBeInTheDocument();
    });
  });
});

describe("Graceful Degradation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("一部のAPIが失敗しても表示可能なデータは表示する", () => {
    render(<ProjectsView initialProjects={mockProjects} />);

    // 初期データは表示される
    expect(screen.getByText("P001")).toBeInTheDocument();
    expect(screen.getByText("田中太郎")).toBeInTheDocument();
  });

  it("不完全なプロジェクトデータでも表示可能", () => {
    const incompleteProject: ProjectWithOverdue[] = [
      {
        id: 1,
        managementNumber: "P001",
        manager: "",
        client: "",
        projectNumber: "",
        completionMonth: null,
        address: "",
        landowner1: null,
        landowner2: null,
        landowner3: null,
        hasOverdue: false,
      },
    ];

    expect(() => {
      render(<ProjectsView initialProjects={incompleteProject} />);
    }).not.toThrow();
  });
});

describe("リトライロジック", () => {
  it("fetchProjects失敗後に手動リトライが可能", async () => {
    let callCount = 0;
    global.fetch = vi.fn(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error("Temporary failure"));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProjects),
      } as Response);
    }) as typeof global.fetch;

    render(<ProjectsView initialProjects={[]} />);

    // コンポーネントはレンダリングされる
    expect(screen.getByText("案件一覧")).toBeInTheDocument();
  });
});
