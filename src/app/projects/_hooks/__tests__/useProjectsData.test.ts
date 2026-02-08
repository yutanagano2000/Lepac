import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
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
    landowner1: "地主A",
    landowner2: null,
    landowner3: null,
    hasOverdue: false,
    commentSearchText: "進捗良好",
    todoSearchText: "現地調査",
  },
  {
    id: 2,
    managementNumber: "P002",
    manager: "佐藤花子",
    client: "クライアントB",
    projectNumber: "2024-002",
    completionMonth: "2025-01",
    address: "東京都新宿区",
    landowner1: "地主B",
    landowner2: "地主C",
    landowner3: null,
    hasOverdue: true,
    commentSearchText: "要確認",
    todoSearchText: "書類提出",
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

describe("useProjectsData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProjects),
      } as Response)
    ) as typeof global.fetch;
  });

  describe("初期状態", () => {
    it("初期プロジェクトが設定される", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      expect(result.current.projects).toEqual(mockProjects);
      expect(result.current.filteredProjects).toEqual(mockProjects);
    });

    it("searchQueryは空文字", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      expect(result.current.searchQuery).toBe("");
    });
  });

  describe("検索フィルタリング", () => {
    it("管理番号で検索できる", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      act(() => {
        result.current.setSearchQuery("P001");
      });

      expect(result.current.filteredProjects.length).toBe(1);
      expect(result.current.filteredProjects[0].managementNumber).toBe("P001");
    });

    it("案件番号で検索できる", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      act(() => {
        result.current.setSearchQuery("2024-002");
      });

      expect(result.current.filteredProjects.length).toBe(1);
      expect(result.current.filteredProjects[0].projectNumber).toBe("2024-002");
    });

    it("住所で検索できる", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      act(() => {
        result.current.setSearchQuery("渋谷");
      });

      expect(result.current.filteredProjects.length).toBe(1);
      expect(result.current.filteredProjects[0].address).toContain("渋谷");
    });

    it("地権者名で検索できる", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      act(() => {
        result.current.setSearchQuery("地主B");
      });

      expect(result.current.filteredProjects.length).toBe(1);
      expect(result.current.filteredProjects[0].landowner1).toBe("地主B");
    });

    it("コメント内容で検索できる", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      act(() => {
        result.current.setSearchQuery("進捗良好");
      });

      expect(result.current.filteredProjects.length).toBe(1);
    });

    it("TODO内容で検索できる", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      act(() => {
        result.current.setSearchQuery("現地調査");
      });

      expect(result.current.filteredProjects.length).toBe(1);
    });

    it("大文字小文字を区別しない", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      act(() => {
        result.current.setSearchQuery("p001");
      });

      expect(result.current.filteredProjects.length).toBe(1);
    });

    it("空白クエリでは全件表示", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      act(() => {
        result.current.setSearchQuery("   ");
      });

      expect(result.current.filteredProjects.length).toBe(2);
    });
  });

  describe("チェックボックスフィルタリング", () => {
    it("管理番号フィルターが適用される", () => {
      const filters: ProjectFilters = {
        ...emptyFilters,
        selectedManagementNumbers: new Set(["P001"]),
      };

      const { result } = renderHook(() =>
        useProjectsData(mockProjects, filters)
      );

      expect(result.current.filteredProjects.length).toBe(1);
      expect(result.current.filteredProjects[0].managementNumber).toBe("P001");
    });

    it("担当者フィルターが適用される", () => {
      const filters: ProjectFilters = {
        ...emptyFilters,
        selectedManagers: new Set(["佐藤花子"]),
      };

      const { result } = renderHook(() =>
        useProjectsData(mockProjects, filters)
      );

      expect(result.current.filteredProjects.length).toBe(1);
      expect(result.current.filteredProjects[0].manager).toBe("佐藤花子");
    });

    it("クライアントフィルターが適用される", () => {
      const filters: ProjectFilters = {
        ...emptyFilters,
        selectedClients: new Set(["クライアントA"]),
      };

      const { result } = renderHook(() =>
        useProjectsData(mockProjects, filters)
      );

      expect(result.current.filteredProjects.length).toBe(1);
    });

    it("案件番号フィルターが適用される", () => {
      const filters: ProjectFilters = {
        ...emptyFilters,
        selectedProjectNumbers: new Set(["2024-001"]),
      };

      const { result } = renderHook(() =>
        useProjectsData(mockProjects, filters)
      );

      expect(result.current.filteredProjects.length).toBe(1);
    });

    it("完成月フィルターが適用される", () => {
      const filters: ProjectFilters = {
        ...emptyFilters,
        selectedCompletionMonths: new Set(["2024-12"]),
      };

      const { result } = renderHook(() =>
        useProjectsData(mockProjects, filters)
      );

      expect(result.current.filteredProjects.length).toBe(1);
    });
  });

  describe("updateLocalProject", () => {
    it("プロジェクトのフィールドを更新する", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      act(() => {
        result.current.updateLocalProject(1, "manager", "新担当者");
      });

      const updated = result.current.projects.find((p) => p.id === 1);
      expect(updated?.manager).toBe("新担当者");
    });

    it("存在しないプロジェクトIDでは何も変更しない", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      act(() => {
        result.current.updateLocalProject(999, "manager", "新担当者");
      });

      expect(result.current.projects).toEqual(mockProjects);
    });

    it("nullを設定できる", () => {
      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      act(() => {
        result.current.updateLocalProject(1, "completionMonth", null);
      });

      const updated = result.current.projects.find((p) => p.id === 1);
      expect(updated?.completionMonth).toBeNull();
    });
  });

  describe("fetchProjects", () => {
    it("APIからプロジェクトを取得する", async () => {
      const { result } = renderHook(() =>
        useProjectsData([], emptyFilters)
      );

      act(() => {
        result.current.fetchProjects();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/projects", {
          cache: "no-store",
        });
      });
    });

    it("エラー時もクラッシュしない", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      global.fetch = vi.fn(() => Promise.reject(new Error("Network error"))) as typeof global.fetch;

      const { result } = renderHook(() =>
        useProjectsData(mockProjects, emptyFilters)
      );

      act(() => {
        result.current.fetchProjects();
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });
});
