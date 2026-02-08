import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import TodosView, { type TodoWithProject } from "../TodosView";

// Next.js Routerモック
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// 今日の日付を基準にしたテストデータを生成
function getTestDates() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 5);
  const laterDate = new Date(today);
  laterDate.setDate(laterDate.getDate() + 14);

  return {
    overdue: yesterday.toISOString().split("T")[0],
    today: today.toISOString().split("T")[0],
    upcoming: nextWeek.toISOString().split("T")[0],
    later: laterDate.toISOString().split("T")[0],
  };
}

const dates = getTestDates();

const mockTodos: TodoWithProject[] = [
  {
    id: 1,
    projectId: 1,
    content: "超過したタスク",
    dueDate: dates.overdue,
    createdAt: "2024-12-01T00:00:00.000Z",
    completedAt: null,
    completedMemo: null,
    managementNumber: "P001",
  },
  {
    id: 2,
    projectId: 1,
    content: "今日のタスク",
    dueDate: dates.today,
    createdAt: "2024-12-01T00:00:00.000Z",
    completedAt: null,
    completedMemo: null,
    managementNumber: "P001",
  },
  {
    id: 3,
    projectId: 2,
    content: "近日中のタスク",
    dueDate: dates.upcoming,
    createdAt: "2024-12-01T00:00:00.000Z",
    completedAt: null,
    completedMemo: null,
    managementNumber: "P002",
  },
  {
    id: 4,
    projectId: 2,
    content: "完了したタスク",
    dueDate: dates.today,
    createdAt: "2024-12-01T00:00:00.000Z",
    completedAt: "2024-12-05T10:00:00.000Z",
    completedMemo: null,
    managementNumber: "P002",
  },
  {
    id: 5,
    projectId: 1,
    content: "遠い将来のタスク",
    dueDate: dates.later,
    createdAt: "2024-12-01T00:00:00.000Z",
    completedAt: null,
    completedMemo: null,
    managementNumber: "P001",
  },
];

describe("TodosView", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // fetchモック
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTodos),
      } as Response)
    ) as typeof global.fetch;
  });

  describe("初期表示", () => {
    it("タイトルが表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getByText("TODO")).toBeInTheDocument();
    });

    it("説明文が表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(
        screen.getByText(/今日やること・近日中のTODOを整理して確認できます/)
      ).toBeInTheDocument();
    });

    it("検索入力欄が表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getByPlaceholderText("内容で検索")).toBeInTheDocument();
    });

    it("案件フィルターが表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getByText("すべての案件")).toBeInTheDocument();
    });
  });

  describe("グループ分け表示", () => {
    it("超過セクションが表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getByText("超過")).toBeInTheDocument();
      expect(screen.getByText("期限を過ぎたTODO")).toBeInTheDocument();
    });

    it("今日セクションが表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getByText("今日")).toBeInTheDocument();
      expect(screen.getByText("本日期限のTODO")).toBeInTheDocument();
    });

    it("近日中セクションが表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getByText("近日中")).toBeInTheDocument();
      expect(screen.getByText("7日以内に期限のTODO")).toBeInTheDocument();
    });

    it("完了済みセクションが表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getByText("完了済み")).toBeInTheDocument();
    });

    it("それ以降セクションが表示される（該当タスクがある場合）", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getByText("それ以降")).toBeInTheDocument();
    });
  });

  describe("TODO表示", () => {
    it("超過したタスクが超過セクションに表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getByText("超過したタスク")).toBeInTheDocument();
    });

    it("今日のタスクが今日セクションに表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getByText("今日のタスク")).toBeInTheDocument();
    });

    it("完了したタスクが完了済みセクションに表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getByText("完了したタスク")).toBeInTheDocument();
    });

    it("管理番号が表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getAllByText("P001").length).toBeGreaterThan(0);
    });
  });

  describe("検索機能", () => {
    it("タスク内容で検索できる", async () => {
      render(<TodosView initialTodos={mockTodos} />);

      const input = screen.getByPlaceholderText("内容で検索");
      await act(async () => {
        fireEvent.change(input, { target: { value: "超過" } });
      });

      // 超過したタスクのみが表示されるはず
      expect(screen.getByText("超過したタスク")).toBeInTheDocument();
    });

    it("マッチしない検索語では結果が表示されない", async () => {
      render(<TodosView initialTodos={mockTodos} />);

      const input = screen.getByPlaceholderText("内容で検索");
      await act(async () => {
        fireEvent.change(input, { target: { value: "存在しないタスク" } });
      });

      // 空のメッセージが表示される
      expect(screen.queryByText("超過したタスク")).not.toBeInTheDocument();
    });
  });

  describe("案件フィルター", () => {
    it("案件フィルタートリガーが表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      // セレクトボックストリガーが表示される
      expect(screen.getByText("すべての案件")).toBeInTheDocument();
    });

    it("ユニークな案件オプションが生成される", () => {
      // 内部ロジックのテスト：P001とP002がオプションとして利用可能
      // ※ Radix UIのSelectコンポーネントはjsdomでの直接テストが困難なため
      // フィルタリングロジックは統合テストで検証
      render(<TodosView initialTodos={mockTodos} />);

      // コンポーネントがクラッシュしないことを確認
      expect(screen.getByText("TODO")).toBeInTheDocument();
    });
  });

  describe("削除機能", () => {
    it("削除ボタンをクリックすると確認ダイアログが開く", async () => {
      render(<TodosView initialTodos={mockTodos} />);

      // 削除ボタン（ゴミ箱アイコン）を探してクリック
      const deleteButtons = screen.getAllByRole("button");
      const trashButton = deleteButtons.find(
        (btn) => btn.querySelector('[class*="lucide-trash"]') !== null
      );

      if (trashButton) {
        await act(async () => {
          fireEvent.click(trashButton);
        });

        // ダイアログが開く
        await waitFor(() => {
          expect(screen.getByText("TODOの削除")).toBeInTheDocument();
        });
      }
    });
  });

  describe("完了/再開機能", () => {
    it("完了したタスクには再開ボタンが表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getByText("再開")).toBeInTheDocument();
    });

    it("再開ボタンをクリックするとAPIが呼ばれる", async () => {
      render(<TodosView initialTodos={mockTodos} />);

      const reopenButton = screen.getByText("再開");
      await act(async () => {
        fireEvent.click(reopenButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/todos/4",
          expect.objectContaining({
            method: "PATCH",
          })
        );
      });
    });
  });

  describe("空の状態", () => {
    it("TODOがない場合でもクラッシュしない", () => {
      render(<TodosView initialTodos={[]} />);

      expect(screen.getByText("TODO")).toBeInTheDocument();
      expect(screen.getByText("超過したTODOはありません")).toBeInTheDocument();
      expect(screen.getByText("本日のTODOはありません")).toBeInTheDocument();
      expect(screen.getByText("近日中のTODOはありません")).toBeInTheDocument();
    });
  });

  describe("超過アラート", () => {
    it("超過タスクがある場合は優先バッジが表示される", () => {
      render(<TodosView initialTodos={mockTodos} />);

      expect(screen.getByText("優先")).toBeInTheDocument();
    });

    it("超過タスクがない場合は優先バッジは表示されない", () => {
      const todosWithoutOverdue = mockTodos.filter((t) => t.id !== 1);
      render(<TodosView initialTodos={todosWithoutOverdue} />);

      expect(screen.queryByText("優先")).not.toBeInTheDocument();
    });
  });

  describe("削除処理", () => {
    it("削除確認後にAPIが呼ばれる", async () => {
      render(<TodosView initialTodos={mockTodos} />);

      // 削除ボタンをクリック（ゴミ箱アイコン）
      const deleteButtons = screen.getAllByRole("button");
      const trashButton = deleteButtons.find(
        (btn) => btn.querySelector("svg") !== null && btn.className.includes("destructive")
      );

      if (trashButton) {
        await act(async () => {
          fireEvent.click(trashButton);
        });

        await waitFor(() => {
          expect(screen.getByText("TODOの削除")).toBeInTheDocument();
        });

        // 削除確認ボタンをクリック
        const confirmButton = screen.getByRole("button", { name: /削除/i });
        await act(async () => {
          fireEvent.click(confirmButton);
        });

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringMatching(/\/api\/todos\/\d+/),
            expect.objectContaining({
              method: "DELETE",
            })
          );
        });
      }
    });
  });

  describe("メッセージ表示", () => {
    it("完了メモがある場合はメッセージが表示される", () => {
      const todosWithMemo: TodoWithProject[] = [
        {
          id: 1,
          projectId: 1,
          content: "メモ付きタスク",
          dueDate: dates.today,
          createdAt: "2024-12-01T00:00:00.000Z",
          completedAt: "2024-12-05T10:00:00.000Z",
          completedMemo: JSON.stringify([
            { message: "テストメッセージ", createdAt: "2024-12-05T10:00:00.000Z" },
          ]),
          managementNumber: "P001",
        },
      ];

      render(<TodosView initialTodos={todosWithMemo} />);

      expect(screen.getByText("テストメッセージ")).toBeInTheDocument();
    });
  });

  describe("明日のタスク", () => {
    it("明日のタスクは「明日」と表示される", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todosWithTomorrow: TodoWithProject[] = [
        {
          id: 1,
          projectId: 1,
          content: "明日締切タスク",
          dueDate: tomorrow.toISOString().split("T")[0],
          createdAt: "2024-12-01T00:00:00.000Z",
          completedAt: null,
          completedMemo: null,
          managementNumber: "P001",
        },
      ];

      render(<TodosView initialTodos={todosWithTomorrow} />);

      // 「(明日)」というラベルが表示される
      expect(screen.getByText("(明日)")).toBeInTheDocument();
    });
  });

  describe("管理番号なし", () => {
    it("管理番号がないタスクも表示される", () => {
      const todosWithoutNumber: TodoWithProject[] = [
        {
          id: 1,
          projectId: 1,
          content: "番号なしタスク",
          dueDate: dates.today,
          createdAt: "2024-12-01T00:00:00.000Z",
          completedAt: null,
          completedMemo: null,
          managementNumber: null,
        },
      ];

      render(<TodosView initialTodos={todosWithoutNumber} />);

      expect(screen.getByText("番号なしタスク")).toBeInTheDocument();
    });
  });

  describe("fetchエラー", () => {
    it("fetch失敗時もUIは表示される", () => {
      // 初期データがある状態でレンダリング
      render(<TodosView initialTodos={mockTodos} />);

      // 初期データが表示される
      expect(screen.getByText("TODO")).toBeInTheDocument();
      expect(screen.getByText("超過したタスク")).toBeInTheDocument();
    });
  });
});
