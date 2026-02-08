"use client";

import { useState, useMemo, useCallback } from "react";
import type { ProjectWithProgress } from "../_types";

interface UseTimelineFiltersOptions {
  projects: ProjectWithProgress[];
}

interface UseTimelineFiltersReturn {
  // 検索
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // フィルターポップオーバー
  filterOpen: boolean;
  setFilterOpen: (open: boolean) => void;
  filterSearchQuery: string;
  setFilterSearchQuery: (query: string) => void;

  // 選択状態
  selectedProjectIds: Set<number>;
  toggleProjectSelection: (projectId: number) => void;
  selectAll: () => void;
  clearAll: () => void;
  clearFilter: () => void;

  // 計算済みリスト
  filterableProjects: ProjectWithProgress[];
  filteredProjects: ProjectWithProgress[];
  isFiltered: boolean;
}

/**
 * タイムラインのフィルター機能を管理するフック
 */
export function useTimelineFilters({
  projects,
}: UseTimelineFiltersOptions): UseTimelineFiltersReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(new Set());
  const [filterSearchQuery, setFilterSearchQuery] = useState("");

  // フィルター内の検索でフィルタリングされた案件リスト
  const filterableProjects = useMemo(() => {
    if (!filterSearchQuery.trim()) return projects;
    const q = filterSearchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.managementNumber.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q)
    );
  }, [projects, filterSearchQuery]);

  // チェックボックスの選択/解除
  const toggleProjectSelection = useCallback((projectId: number) => {
    setSelectedProjectIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  }, []);

  // 全選択
  const selectAll = useCallback(() => {
    setSelectedProjectIds(new Set(filterableProjects.map((p) => p.id)));
  }, [filterableProjects]);

  // 全解除
  const clearAll = useCallback(() => {
    setSelectedProjectIds(new Set());
  }, []);

  // フィルターをクリア
  const clearFilter = useCallback(() => {
    setSelectedProjectIds(new Set());
    setFilterSearchQuery("");
  }, []);

  // フィルタリングされた案件リスト（テキスト検索 + チェックボックス選択）
  const filteredProjects = useMemo(() => {
    let result = projects;

    // テキスト検索フィルター
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.managementNumber.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q)
      );
    }

    // チェックボックス選択フィルター
    if (selectedProjectIds.size > 0) {
      result = result.filter((p) => selectedProjectIds.has(p.id));
    }

    return result;
  }, [projects, searchQuery, selectedProjectIds]);

  const isFiltered = selectedProjectIds.size > 0;

  return {
    searchQuery,
    setSearchQuery,
    filterOpen,
    setFilterOpen,
    filterSearchQuery,
    setFilterSearchQuery,
    selectedProjectIds,
    toggleProjectSelection,
    selectAll,
    clearAll,
    clearFilter,
    filterableProjects,
    filteredProjects,
    isFiltered,
  };
}
