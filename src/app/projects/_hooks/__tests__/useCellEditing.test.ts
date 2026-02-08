import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCellEditing } from "../useCellEditing";
import type { ProjectWithOverdue } from "../../_types";

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
  {
    id: 2,
    managementNumber: "P002",
    manager: "佐藤花子",
    client: "クライアントB",
    projectNumber: "2024-002",
    completionMonth: null,
    address: "東京都新宿区",
    landowner1: null,
    landowner2: null,
    landowner3: null,
    hasOverdue: true,
  },
];

describe("useCellEditing", () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)
    ) as typeof global.fetch;
  });

  describe("初期状態", () => {
    it("isEditModeが初期状態でfalse", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      expect(result.current.isEditMode).toBe(false);
    });

    it("editingCellが初期状態でnull", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      expect(result.current.editingCell).toBeNull();
    });

    it("editingValueが初期状態で空文字", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      expect(result.current.editingValue).toBe("");
    });

    it("isSavingが初期状態でfalse", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      expect(result.current.isSaving).toBe(false);
    });
  });

  describe("toggleEditMode", () => {
    it("編集モードをオンにできる", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      expect(result.current.isEditMode).toBe(true);
    });

    it("編集モードをオフにできる", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.toggleEditMode();
      });

      expect(result.current.isEditMode).toBe(false);
    });

    it("編集モードオフ時に編集中のセルがキャンセルされる", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      // 編集モードをオンにしてセル編集開始
      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      expect(result.current.editingCell).not.toBeNull();

      // 編集モードをオフにする
      act(() => {
        result.current.toggleEditMode();
      });

      expect(result.current.editingCell).toBeNull();
      expect(result.current.editingValue).toBe("");
    });
  });

  describe("startEditCell", () => {
    it("編集モードでないと編集開始できない", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      expect(result.current.editingCell).toBeNull();
    });

    it("編集モードで編集開始できる", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      expect(result.current.editingCell).toEqual({
        projectId: 1,
        columnKey: "manager",
      });
      expect(result.current.editingValue).toBe("田中太郎");
    });

    it("'-'の値は空文字に変換される", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "completionMonth", "-");
      });

      expect(result.current.editingValue).toBe("");
    });
  });

  describe("saveEditCell", () => {
    it("編集中のセルがない場合は何もしない", async () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      await act(async () => {
        await result.current.saveEditCell();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("編集内容がAPIに送信される", async () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      act(() => {
        result.current.setEditingValue("新担当者");
      });

      await act(async () => {
        await result.current.saveEditCell();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/projects/1",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("保存成功時にonUpdateが呼ばれる", async () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      act(() => {
        result.current.setEditingValue("新担当者");
      });

      await act(async () => {
        await result.current.saveEditCell();
      });

      expect(mockOnUpdate).toHaveBeenCalledWith(1, "manager", "新担当者");
    });

    it("空の値はnullとして保存される", async () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      act(() => {
        result.current.setEditingValue("");
      });

      await act(async () => {
        await result.current.saveEditCell();
      });

      expect(mockOnUpdate).toHaveBeenCalledWith(1, "manager", null);
    });

    it("保存後に編集状態がクリアされる", async () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      await act(async () => {
        await result.current.saveEditCell();
      });

      expect(result.current.editingCell).toBeNull();
      expect(result.current.editingValue).toBe("");
    });

    it("存在しないプロジェクトIDでは何も更新しない", async () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      // 直接editingCellを設定するために、存在するIDで開始してから
      act(() => {
        result.current.startEditCell(999, "manager", "test");
      });

      // editingCellは設定されるが、projectsに該当IDがないので保存は実行されない
      await act(async () => {
        await result.current.saveEditCell();
      });

      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it("APIエラー時もクラッシュしない", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      global.fetch = vi.fn(() => Promise.reject(new Error("Network error"))) as typeof global.fetch;

      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      await act(async () => {
        await result.current.saveEditCell();
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.current.editingCell).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe("cancelEditCell", () => {
    it("編集をキャンセルできる", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      act(() => {
        result.current.cancelEditCell();
      });

      expect(result.current.editingCell).toBeNull();
      expect(result.current.editingValue).toBe("");
    });
  });

  describe("handleCellKeyDown", () => {
    it("Enterキーで保存される", async () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      const enterEvent = {
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>;

      await act(async () => {
        result.current.handleCellKeyDown(enterEvent);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it("Escapeキーでキャンセルされる", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      const escapeEvent = {
        key: "Escape",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>;

      act(() => {
        result.current.handleCellKeyDown(escapeEvent);
      });

      expect(result.current.editingCell).toBeNull();
    });

    it("Tabキーで保存される", async () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      const tabEvent = {
        key: "Tab",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>;

      await act(async () => {
        result.current.handleCellKeyDown(tabEvent);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it("その他のキーでは何もしない", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      const otherEvent = {
        key: "a",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>;

      act(() => {
        result.current.handleCellKeyDown(otherEvent);
      });

      expect(result.current.editingCell).not.toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("setEditingValue", () => {
    it("編集値を更新できる", () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      act(() => {
        result.current.setEditingValue("新しい値");
      });

      expect(result.current.editingValue).toBe("新しい値");
    });
  });
});
