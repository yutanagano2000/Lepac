import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCellEditing } from "../useCellEditing";
import { useProjectsData } from "../useProjectsData";
import type { ProjectWithOverdue, ProjectFilters } from "../../_types";

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

const emptyFilters: ProjectFilters = {
  selectedManagementNumbers: new Set(),
  selectedManagers: new Set(),
  selectedClients: new Set(),
  selectedProjectNumbers: new Set(),
  selectedCompletionMonths: new Set(),
  filterSearchQuery: "",
};

describe("Concurrency Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCellEditing 並行処理", () => {
    const mockOnUpdate = vi.fn();

    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response)
      ) as typeof global.fetch;
    });

    it("高速連続編集でも最後の値が保持される", async () => {
      vi.useRealTimers();
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      // 編集モードをオン
      act(() => {
        result.current.toggleEditMode();
      });

      // セル編集開始
      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      // 高速連続で値を変更
      act(() => {
        result.current.setEditingValue("値1");
      });
      act(() => {
        result.current.setEditingValue("値2");
      });
      act(() => {
        result.current.setEditingValue("値3");
      });
      act(() => {
        result.current.setEditingValue("最終値");
      });

      expect(result.current.editingValue).toBe("最終値");

      // 保存
      await act(async () => {
        await result.current.saveEditCell();
      });

      expect(mockOnUpdate).toHaveBeenCalledWith(1, "manager", "最終値");
    });

    it("編集中に別のセルを編集開始すると前の編集が破棄される", () => {
      vi.useRealTimers();
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      // 最初のセル編集
      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });
      act(() => {
        result.current.setEditingValue("変更中");
      });

      // 別のセル編集開始
      act(() => {
        result.current.startEditCell(2, "manager", "佐藤花子");
      });

      // 2番目のセルが編集対象になる
      expect(result.current.editingCell).toEqual({
        projectId: 2,
        columnKey: "manager",
      });
      expect(result.current.editingValue).toBe("佐藤花子");
    });

    it("保存後にeditingCellがクリアされる", async () => {
      const { result } = renderHook(() =>
        useCellEditing({ projects: mockProjects, onUpdate: mockOnUpdate })
      );

      act(() => {
        result.current.toggleEditMode();
      });

      act(() => {
        result.current.startEditCell(1, "manager", "田中太郎");
      });

      expect(result.current.editingCell).not.toBeNull();

      await act(async () => {
        await result.current.saveEditCell();
      });

      // 保存後はeditingCellがクリアされる
      expect(result.current.editingCell).toBeNull();
    });
  });

  describe("useProjectsData 並行処理", () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProjects),
        } as Response)
      ) as typeof global.fetch;
    });

    it("高速連続検索でも正しく動作する", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      // 高速連続で検索クエリを変更
      act(() => {
        result.current.setSearchQuery("P");
        result.current.setSearchQuery("P0");
        result.current.setSearchQuery("P00");
        result.current.setSearchQuery("P001");
      });

      expect(result.current.searchQuery).toBe("P001");
      expect(result.current.filteredProjects.length).toBe(1);
      expect(result.current.filteredProjects[0].managementNumber).toBe("P001");
    });

    it("フィルター変更とsearchQuery変更が同時に発生しても正しく動作する", () => {
      const filtersWithManager: ProjectFilters = {
        ...emptyFilters,
        selectedManagers: new Set(["田中太郎"]),
      };

      const { result, rerender } = renderHook(
        ({ filters }) => useProjectsData(mockProjects, filters),
        { initialProps: { filters: emptyFilters } }
      );

      // 検索クエリを変更（田中太郎のプロジェクトにマッチ）
      act(() => {
        result.current.setSearchQuery("P001");
      });

      // フィルターを変更
      rerender({ filters: filtersWithManager });

      // 両方の条件が適用される（P001かつ田中太郎）
      expect(result.current.filteredProjects.length).toBe(1);
      expect(result.current.filteredProjects[0].manager).toBe("田中太郎");
      expect(result.current.filteredProjects[0].managementNumber).toBe("P001");
    });

    it("updateLocalProjectが連続呼び出しでも正しく動作する", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      // 連続で更新
      act(() => {
        result.current.updateLocalProject(1, "manager", "更新1");
      });
      act(() => {
        result.current.updateLocalProject(1, "client", "更新クライアント");
      });
      act(() => {
        result.current.updateLocalProject(1, "manager", "最終更新");
      });

      const updated = result.current.projects.find((p) => p.id === 1);
      expect(updated?.manager).toBe("最終更新");
      expect(updated?.client).toBe("更新クライアント");
    });
  });

  describe("競合状態の防止", () => {
    it("fetchProjectsを複数回呼び出してもエラーにならない", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProjects),
        } as Response)
      ) as typeof global.fetch;

      const { result } = renderHook(() =>
        useProjectsData([], emptyFilters)
      );

      // 2つのfetchを連続で呼び出し
      await act(async () => {
        result.current.fetchProjects();
        result.current.fetchProjects();
      });

      // 両方完了を待つ
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });
});

describe("検索クエリの状態管理", () => {
  it("検索クエリが正しく更新される", () => {
    const { result } = renderHook(() =>
      useProjectsData(mockProjects, emptyFilters)
    );

    act(() => {
      result.current.setSearchQuery("test");
    });

    expect(result.current.searchQuery).toBe("test");
  });

  it("空クエリで全件表示", () => {
    const { result } = renderHook(() =>
      useProjectsData(mockProjects, emptyFilters)
    );

    act(() => {
      result.current.setSearchQuery("");
    });

    expect(result.current.filteredProjects.length).toBe(2);
  });
});
