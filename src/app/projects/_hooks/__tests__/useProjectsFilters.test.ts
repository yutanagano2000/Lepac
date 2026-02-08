import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectsFilters } from "../useProjectsFilters";
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
    completionMonth: "2025-01",
    address: "東京都新宿区",
    landowner1: null,
    landowner2: null,
    landowner3: null,
    hasOverdue: true,
  },
  {
    id: 3,
    managementNumber: "P003",
    manager: "田中太郎",
    client: "クライアントA",
    projectNumber: "2024-003",
    completionMonth: null,
    address: "東京都港区",
    landowner1: null,
    landowner2: null,
    landowner3: null,
    hasOverdue: false,
  },
];

describe("useProjectsFilters", () => {
  describe("初期状態", () => {
    it("初期状態ではフィルターが適用されていない", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      expect(result.current.isFiltered).toBe(false);
      expect(result.current.selectedManagementNumbers.size).toBe(0);
      expect(result.current.selectedManagers.size).toBe(0);
    });

    it("filterOpenは初期状態でnull", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      expect(result.current.filterOpen).toBeNull();
    });
  });

  describe("ユニーク値の取得", () => {
    it("ユニークな管理番号を取得する", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      expect(result.current.uniqueManagementNumbers).toEqual(["P001", "P002", "P003"]);
    });

    it("ユニークな担当者を取得する（重複を除去）", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      expect(result.current.uniqueManagers).toEqual(["佐藤花子", "田中太郎"]);
    });

    it("ユニークなクライアントを取得する", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      expect(result.current.uniqueClients).toEqual(["クライアントA", "クライアントB"]);
    });

    it("完成月がnullの場合は「未設定」として扱う", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      expect(result.current.uniqueCompletionMonths).toContain("未設定");
    });
  });

  describe("toggleSelection", () => {
    it("選択されていない値を選択する", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      act(() => {
        result.current.toggleSelection(
          "P001",
          result.current.selectedManagementNumbers,
          result.current.setSelectedManagementNumbers
        );
      });

      expect(result.current.selectedManagementNumbers.has("P001")).toBe(true);
      expect(result.current.isFiltered).toBe(true);
    });

    it("選択済みの値を解除する", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      // 選択
      act(() => {
        result.current.toggleSelection(
          "P001",
          result.current.selectedManagementNumbers,
          result.current.setSelectedManagementNumbers
        );
      });

      // 解除
      act(() => {
        result.current.toggleSelection(
          "P001",
          result.current.selectedManagementNumbers,
          result.current.setSelectedManagementNumbers
        );
      });

      expect(result.current.selectedManagementNumbers.has("P001")).toBe(false);
    });
  });

  describe("selectAll", () => {
    it("全ての選択肢を選択する", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      act(() => {
        result.current.selectAll(
          result.current.uniqueManagementNumbers,
          result.current.setSelectedManagementNumbers
        );
      });

      expect(result.current.selectedManagementNumbers.size).toBe(3);
      expect(result.current.selectedManagementNumbers.has("P001")).toBe(true);
      expect(result.current.selectedManagementNumbers.has("P002")).toBe(true);
      expect(result.current.selectedManagementNumbers.has("P003")).toBe(true);
    });
  });

  describe("clearAll", () => {
    it("全ての選択を解除する", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      // まず選択
      act(() => {
        result.current.selectAll(
          result.current.uniqueManagementNumbers,
          result.current.setSelectedManagementNumbers
        );
      });

      // 解除
      act(() => {
        result.current.clearAll(result.current.setSelectedManagementNumbers);
      });

      expect(result.current.selectedManagementNumbers.size).toBe(0);
    });
  });

  describe("clearAllFilters", () => {
    it("全てのフィルターをクリアする", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      // 複数のフィルターを設定
      act(() => {
        result.current.toggleSelection(
          "P001",
          result.current.selectedManagementNumbers,
          result.current.setSelectedManagementNumbers
        );
        result.current.toggleSelection(
          "田中太郎",
          result.current.selectedManagers,
          result.current.setSelectedManagers
        );
      });

      expect(result.current.isFiltered).toBe(true);

      // クリア
      act(() => {
        result.current.clearAllFilters();
      });

      expect(result.current.isFiltered).toBe(false);
      expect(result.current.selectedManagementNumbers.size).toBe(0);
      expect(result.current.selectedManagers.size).toBe(0);
    });
  });

  describe("getFilteredOptions", () => {
    it("検索クエリで選択肢をフィルタリングする", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      const filtered = result.current.getFilteredOptions(
        result.current.uniqueManagementNumbers,
        "P001"
      );

      expect(filtered).toEqual(["P001"]);
    });

    it("空のクエリでは全ての選択肢を返す", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      const filtered = result.current.getFilteredOptions(
        result.current.uniqueManagementNumbers,
        ""
      );

      expect(filtered).toEqual(["P001", "P002", "P003"]);
    });

    it("大文字小文字を区別しない", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      const filtered = result.current.getFilteredOptions(
        result.current.uniqueManagers,
        "田中"
      );

      expect(filtered).toContain("田中太郎");
    });
  });

  describe("setFilterOpen", () => {
    it("フィルターを開く", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      act(() => {
        result.current.setFilterOpen("managementNumber");
      });

      expect(result.current.filterOpen).toBe("managementNumber");
    });

    it("フィルターを閉じる", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      act(() => {
        result.current.setFilterOpen("managementNumber");
      });

      act(() => {
        result.current.setFilterOpen(null);
      });

      expect(result.current.filterOpen).toBeNull();
    });
  });

  describe("isFiltered", () => {
    it("担当者フィルターでisFilteredがtrueになる", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      act(() => {
        result.current.toggleSelection(
          "田中太郎",
          result.current.selectedManagers,
          result.current.setSelectedManagers
        );
      });

      expect(result.current.isFiltered).toBe(true);
    });

    it("クライアントフィルターでisFilteredがtrueになる", () => {
      const { result } = renderHook(() => useProjectsFilters(mockProjects));

      act(() => {
        result.current.toggleSelection(
          "クライアントA",
          result.current.selectedClients,
          result.current.setSelectedClients
        );
      });

      expect(result.current.isFiltered).toBe(true);
    });
  });
});
