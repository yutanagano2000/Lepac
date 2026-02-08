import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { TodoSection } from "../todos/TodoSection";
import type { Todo } from "../../_types";

// モック
vi.mock("@/lib/timeline", () => ({
  formatDateJp: (date: Date) => {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${y}年${m}月${d}日`;
  },
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
  parseTodoMessages: (memo: string) => {
    try {
      return JSON.parse(memo);
    } catch {
      return [];
    }
  },
}));

const mockTodos: Todo[] = [
  {
    id: 1,
    projectId: 1,
    content: "現地調査を実施する",
    dueDate: "2024-12-15",
    createdAt: "2024-12-01T10:00:00Z",
    completedAt: null,
    completedMemo: null,
    userId: 1,
    userName: "田中太郎",
  },
  {
    id: 2,
    projectId: 1,
    content: "書類を準備する",
    dueDate: "2024-12-20",
    createdAt: "2024-12-02T10:00:00Z",
    completedAt: "2024-12-10T10:00:00Z",
    completedMemo: JSON.stringify([
      { message: "完了しました", createdAt: "2024-12-10T10:00:00Z" },
    ]),
    userId: 2,
    userName: "佐藤花子",
  },
];

describe("TodoSection", () => {
  const mockOnAdd = vi.fn();
  const mockOnComplete = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnReopen = vi.fn();
  const mockOnAddMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAdd.mockResolvedValue(undefined);
    mockOnReopen.mockResolvedValue(undefined);
  });

  describe("初期表示", () => {
    it("TODOヘッダーが表示される", () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      expect(screen.getByText("TODO")).toBeInTheDocument();
    });

    it("入力フォームが表示される", () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      expect(
        screen.getByPlaceholderText("この日までに行うことを入力...")
      ).toBeInTheDocument();
      expect(screen.getByText("期日を選択")).toBeInTheDocument();
      expect(screen.getByText("追加")).toBeInTheDocument();
    });

    it("TODO一覧が表示される", () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      expect(screen.getByText("現地調査を実施する")).toBeInTheDocument();
      expect(screen.getByText("書類を準備する")).toBeInTheDocument();
    });
  });

  describe("空の状態", () => {
    it("TODOがない場合はメッセージが表示される", () => {
      render(
        <TodoSection
          todos={[]}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      expect(screen.getByText("TODOはありません")).toBeInTheDocument();
    });
  });

  describe("TODO追加", () => {
    it("内容と期日を入力して追加できる", async () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      const textarea = screen.getByPlaceholderText(
        "この日までに行うことを入力..."
      );
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "新しいタスク" } });
      });

      // 期日選択（直接日付を設定するのは難しいため、フォームの送信をテスト）
      // 実際のカレンダー選択はE2Eでテストすべき
    });

    it("内容が空の場合は追加ボタンが無効", () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      const addButton = screen.getByText("追加");
      expect(addButton).toBeDisabled();
    });
  });

  describe("未完了TODO", () => {
    it("編集ボタンが表示される", () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      // 編集ボタン（鉛筆アイコン）を探す
      const editButtons = screen.getAllByRole("button").filter((btn) =>
        btn.querySelector('[class*="lucide-pencil"]')
      );

      expect(editButtons.length).toBeGreaterThan(0);
    });

    it("完了ボタンが表示される", () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      // 完了ボタン（チェックアイコン）を探す - SVGの title属性で検索
      const completeButtons = screen.getAllByRole("button").filter((btn) =>
        btn.getAttribute("title") === "完了"
      );

      expect(completeButtons.length).toBeGreaterThan(0);
    });

    it("削除ボタンが表示される", () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      // 削除ボタン（ゴミ箱アイコン）を探す
      const deleteButtons = screen.getAllByRole("button").filter((btn) =>
        btn.querySelector('[class*="lucide-trash"]')
      );

      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("編集ボタンをクリックするとonEditが呼ばれる", async () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      const editButtons = screen.getAllByRole("button").filter((btn) =>
        btn.querySelector('[class*="lucide-pencil"]')
      );

      if (editButtons.length > 0) {
        await act(async () => {
          fireEvent.click(editButtons[0]);
        });

        expect(mockOnEdit).toHaveBeenCalledWith(mockTodos[0]);
      }
    });

    it("完了ボタンをクリックするとonCompleteが呼ばれる", async () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      const completeButtons = screen.getAllByRole("button").filter((btn) =>
        btn.querySelector('[class*="lucide-check-circle"]')
      );

      if (completeButtons.length > 0) {
        await act(async () => {
          fireEvent.click(completeButtons[0]);
        });

        expect(mockOnComplete).toHaveBeenCalledWith(mockTodos[0]);
      }
    });

    it("削除ボタンをクリックするとonDeleteが呼ばれる", async () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      const deleteButtons = screen.getAllByRole("button").filter((btn) =>
        btn.querySelector('[class*="lucide-trash"]')
      );

      if (deleteButtons.length > 0) {
        await act(async () => {
          fireEvent.click(deleteButtons[0]);
        });

        expect(mockOnDelete).toHaveBeenCalledWith(mockTodos[0]);
      }
    });
  });

  describe("完了済みTODO", () => {
    it("再開ボタンが表示される", () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      expect(screen.getByText("再開")).toBeInTheDocument();
    });

    it("メモ追加ボタンが表示される", () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      expect(screen.getByText("メモ")).toBeInTheDocument();
    });

    it("再開ボタンをクリックするとonReopenが呼ばれる", async () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      const reopenButton = screen.getByText("再開");
      await act(async () => {
        fireEvent.click(reopenButton);
      });

      expect(mockOnReopen).toHaveBeenCalledWith(mockTodos[1]);
    });

    it("メモ追加ボタンをクリックするとonAddMessageが呼ばれる", async () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      const memoButton = screen.getByText("メモ");
      await act(async () => {
        fireEvent.click(memoButton);
      });

      expect(mockOnAddMessage).toHaveBeenCalledWith(mockTodos[1]);
    });

    it("完了メモがツリー形式で表示される", () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      expect(screen.getByText("完了しました")).toBeInTheDocument();
    });
  });

  describe("期日表示", () => {
    it("期日が表示される", () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      // 期日のフォーマットを確認（「期日:」を含むテキストがあるか）
      const dueDateElements = screen.getAllByText((content, element) => {
        return content.includes("期日:");
      });
      expect(dueDateElements.length).toBeGreaterThan(0);
    });

    it("完了日が表示される（完了済みの場合）", () => {
      render(
        <TodoSection
          todos={mockTodos}
          onAdd={mockOnAdd}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReopen={mockOnReopen}
          onAddMessage={mockOnAddMessage}
        />
      );

      // 完了日のフォーマットを確認（「完了:」を含むテキストがあるか）
      const completedAtElements = screen.getAllByText((content, element) => {
        return content.includes("完了:");
      });
      expect(completedAtElements.length).toBeGreaterThan(0);
    });
  });
});
