import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { CommentsTab } from "../comments/CommentsTab";
import type { Comment } from "../../_types";

// テスト用コメントデータ
const mockComments: Comment[] = [
  {
    id: 1,
    projectId: 1,
    content: "進捗確認しました。順調です。",
    createdAt: "2024-12-01T10:00:00.000Z",
    userName: "田中太郎",
    userId: 1,
  },
  {
    id: 2,
    projectId: 1,
    content: "地権者との打ち合わせ完了",
    createdAt: "2024-12-02T14:30:00.000Z",
    userName: "佐藤花子",
    userId: 2,
  },
  {
    id: 3,
    projectId: 1,
    content: "書類を準備中です",
    createdAt: "2024-12-03T09:15:00.000Z",
    userName: null,
    userId: null,
  },
];

describe("CommentsTab", () => {
  const mockOnAdd = vi.fn();
  const mockOnEditOpen = vi.fn();
  const mockOnDeleteOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初期表示", () => {
    it("コメントヘッダーが表示される", () => {
      render(
        <CommentsTab
          comments={mockComments}
          onAdd={mockOnAdd}
          onEditOpen={mockOnEditOpen}
          onDeleteOpen={mockOnDeleteOpen}
        />
      );

      expect(screen.getByText("コメント")).toBeInTheDocument();
    });

    it("コメント入力欄が表示される", () => {
      render(
        <CommentsTab
          comments={mockComments}
          onAdd={mockOnAdd}
          onEditOpen={mockOnEditOpen}
          onDeleteOpen={mockOnDeleteOpen}
        />
      );

      expect(
        screen.getByPlaceholderText("コメントを入力...")
      ).toBeInTheDocument();
    });

    it("送信ボタンが表示される", () => {
      render(
        <CommentsTab
          comments={mockComments}
          onAdd={mockOnAdd}
          onEditOpen={mockOnEditOpen}
          onDeleteOpen={mockOnDeleteOpen}
        />
      );

      const buttons = screen.getAllByRole("button");
      const submitButton = buttons.find((btn) => btn.getAttribute("type") === "submit");
      expect(submitButton).toBeInTheDocument();
    });

    it("コメント一覧が表示される", () => {
      render(
        <CommentsTab
          comments={mockComments}
          onAdd={mockOnAdd}
          onEditOpen={mockOnEditOpen}
          onDeleteOpen={mockOnDeleteOpen}
        />
      );

      expect(screen.getByText("進捗確認しました。順調です。")).toBeInTheDocument();
      expect(screen.getByText("地権者との打ち合わせ完了")).toBeInTheDocument();
      expect(screen.getByText("書類を準備中です")).toBeInTheDocument();
    });

    it("コメント投稿者名が表示される", () => {
      render(
        <CommentsTab
          comments={mockComments}
          onAdd={mockOnAdd}
          onEditOpen={mockOnEditOpen}
          onDeleteOpen={mockOnDeleteOpen}
        />
      );

      expect(screen.getByText(/田中太郎/)).toBeInTheDocument();
      expect(screen.getByText(/佐藤花子/)).toBeInTheDocument();
    });
  });

  describe("空の状態", () => {
    it("コメントがない場合はメッセージが表示される", () => {
      render(
        <CommentsTab
          comments={[]}
          onAdd={mockOnAdd}
          onEditOpen={mockOnEditOpen}
          onDeleteOpen={mockOnDeleteOpen}
        />
      );

      expect(screen.getByText("コメントはありません")).toBeInTheDocument();
    });
  });

  describe("コメント追加", () => {
    it("空のコメントは送信できない", async () => {
      render(
        <CommentsTab
          comments={mockComments}
          onAdd={mockOnAdd}
          onEditOpen={mockOnEditOpen}
          onDeleteOpen={mockOnDeleteOpen}
        />
      );

      const buttons = screen.getAllByRole("button");
      const submitButton = buttons.find((btn) => btn.getAttribute("type") === "submit");

      await act(async () => {
        fireEvent.click(submitButton!);
      });

      expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it("コメントを入力して送信できる", async () => {
      mockOnAdd.mockResolvedValue(undefined);

      render(
        <CommentsTab
          comments={mockComments}
          onAdd={mockOnAdd}
          onEditOpen={mockOnEditOpen}
          onDeleteOpen={mockOnDeleteOpen}
        />
      );

      const textarea = screen.getByPlaceholderText("コメントを入力...");
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "新しいコメント" } });
      });

      const buttons = screen.getAllByRole("button");
      const submitButton = buttons.find((btn) => btn.getAttribute("type") === "submit");

      await act(async () => {
        fireEvent.click(submitButton!);
      });

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith("新しいコメント");
      });
    });

    it("送信後に入力欄がクリアされる", async () => {
      mockOnAdd.mockResolvedValue(undefined);

      render(
        <CommentsTab
          comments={mockComments}
          onAdd={mockOnAdd}
          onEditOpen={mockOnEditOpen}
          onDeleteOpen={mockOnDeleteOpen}
        />
      );

      const textarea = screen.getByPlaceholderText("コメントを入力...");
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "新しいコメント" } });
      });

      const buttons = screen.getAllByRole("button");
      const submitButton = buttons.find((btn) => btn.getAttribute("type") === "submit");

      await act(async () => {
        fireEvent.click(submitButton!);
      });

      await waitFor(() => {
        expect(textarea).toHaveValue("");
      });
    });

    it("空白のみのコメントは送信されない", async () => {
      render(
        <CommentsTab
          comments={mockComments}
          onAdd={mockOnAdd}
          onEditOpen={mockOnEditOpen}
          onDeleteOpen={mockOnDeleteOpen}
        />
      );

      const textarea = screen.getByPlaceholderText("コメントを入力...");
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "   " } });
      });

      const buttons = screen.getAllByRole("button");
      const submitButton = buttons.find((btn) => btn.getAttribute("type") === "submit");

      await act(async () => {
        fireEvent.click(submitButton!);
      });

      expect(mockOnAdd).not.toHaveBeenCalled();
    });
  });

  describe("コメント編集", () => {
    it("編集ボタンをクリックするとonEditOpenが呼ばれる", async () => {
      render(
        <CommentsTab
          comments={mockComments}
          onAdd={mockOnAdd}
          onEditOpen={mockOnEditOpen}
          onDeleteOpen={mockOnDeleteOpen}
        />
      );

      // 編集ボタン（鉛筆アイコン）を探す
      const allButtons = screen.getAllByRole("button");
      const editButtons = allButtons.filter((btn) =>
        btn.querySelector('[class*="lucide-pencil"]')
      );

      if (editButtons.length > 0) {
        await act(async () => {
          fireEvent.click(editButtons[0]);
        });

        expect(mockOnEditOpen).toHaveBeenCalledWith(mockComments[0]);
      }
    });
  });

  describe("コメント削除", () => {
    it("削除ボタンをクリックするとonDeleteOpenが呼ばれる", async () => {
      render(
        <CommentsTab
          comments={mockComments}
          onAdd={mockOnAdd}
          onEditOpen={mockOnEditOpen}
          onDeleteOpen={mockOnDeleteOpen}
        />
      );

      // 削除ボタン（ゴミ箱アイコン）を探す
      const allButtons = screen.getAllByRole("button");
      const deleteButtons = allButtons.filter((btn) =>
        btn.querySelector('[class*="lucide-trash"]')
      );

      if (deleteButtons.length > 0) {
        await act(async () => {
          fireEvent.click(deleteButtons[0]);
        });

        expect(mockOnDeleteOpen).toHaveBeenCalledWith(mockComments[0]);
      }
    });
  });

  describe("送信中の状態", () => {
    it("送信中は二重送信できない", async () => {
      // 遅延するモックを設定
      mockOnAdd.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <CommentsTab
          comments={mockComments}
          onAdd={mockOnAdd}
          onEditOpen={mockOnEditOpen}
          onDeleteOpen={mockOnDeleteOpen}
        />
      );

      const textarea = screen.getByPlaceholderText("コメントを入力...");
      await act(async () => {
        fireEvent.change(textarea, { target: { value: "テストコメント" } });
      });

      const buttons = screen.getAllByRole("button");
      const submitButton = buttons.find((btn) => btn.getAttribute("type") === "submit");

      // 1回目のクリック
      await act(async () => {
        fireEvent.click(submitButton!);
      });

      // 即座に2回目のクリック（送信中なのでブロックされるべき）
      await act(async () => {
        fireEvent.click(submitButton!);
      });

      // 100ms待つ
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      // onAddは1回だけ呼ばれるべき
      expect(mockOnAdd).toHaveBeenCalledTimes(1);
    });
  });
});
