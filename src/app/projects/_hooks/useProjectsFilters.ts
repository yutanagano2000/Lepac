"use client";

import { useState, useMemo, useCallback } from "react";
import type { ProjectWithOverdue, ProjectFilters } from "../_types";

interface UseProjectsFiltersReturn {
  filters: ProjectFilters;
  filterOpen: string | null;
  setFilterOpen: (key: string | null) => void;
  setFilterSearchQuery: (query: string) => void;
  // セレクター
  selectedManagementNumbers: Set<string>;
  selectedManagers: Set<string>;
  selectedClients: Set<string>;
  selectedProjectNumbers: Set<string>;
  selectedCompletionMonths: Set<string>;
  setSelectedManagementNumbers: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedManagers: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedClients: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedProjectNumbers: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedCompletionMonths: React.Dispatch<React.SetStateAction<Set<string>>>;
  // ユニーク値
  uniqueManagementNumbers: string[];
  uniqueManagers: string[];
  uniqueClients: string[];
  uniqueProjectNumbers: string[];
  uniqueCompletionMonths: string[];
  // アクション
  toggleSelection: (
    value: string,
    selectedSet: Set<string>,
    setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => void;
  selectAll: (
    options: string[],
    setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => void;
  clearAll: (setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>) => void;
  clearAllFilters: () => void;
  getFilteredOptions: (options: string[], searchQuery: string) => string[];
  isFiltered: boolean;
}

export function useProjectsFilters(projects: ProjectWithOverdue[]): UseProjectsFiltersReturn {
  const [filterOpen, setFilterOpen] = useState<string | null>(null);
  const [selectedManagementNumbers, setSelectedManagementNumbers] = useState<Set<string>>(new Set());
  const [selectedManagers, setSelectedManagers] = useState<Set<string>>(new Set());
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [selectedProjectNumbers, setSelectedProjectNumbers] = useState<Set<string>>(new Set());
  const [selectedCompletionMonths, setSelectedCompletionMonths] = useState<Set<string>>(new Set());
  const [filterSearchQuery, setFilterSearchQuery] = useState("");

  // 各フィルターの選択肢を取得
  const uniqueManagementNumbers = useMemo(
    () => [...new Set(projects.map((p) => p.managementNumber))].sort(),
    [projects]
  );
  const uniqueManagers = useMemo(
    () => [...new Set(projects.map((p) => p.manager))].sort(),
    [projects]
  );
  const uniqueClients = useMemo(
    () => [...new Set(projects.map((p) => p.client))].sort(),
    [projects]
  );
  const uniqueProjectNumbers = useMemo(
    () => [...new Set(projects.map((p) => p.projectNumber))].sort(),
    [projects]
  );
  const uniqueCompletionMonths = useMemo(
    () => [...new Set(projects.map((p) => p.completionMonth || "未設定"))].sort(),
    [projects]
  );

  // フィルター内検索で絞り込んだ選択肢
  const getFilteredOptions = useCallback((options: string[], searchQuery: string) => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, []);

  // チェックボックスの選択/解除
  const toggleSelection = useCallback(
    (
      value: string,
      selectedSet: Set<string>,
      setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>
    ) => {
      setSelectedSet((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }
        return newSet;
      });
    },
    []
  );

  // 全選択
  const selectAll = useCallback(
    (options: string[], setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>) => {
      setSelectedSet(new Set(options));
    },
    []
  );

  // 全解除
  const clearAll = useCallback(
    (setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>) => {
      setSelectedSet(new Set());
    },
    []
  );

  // 全フィルターをクリア
  const clearAllFilters = useCallback(() => {
    setSelectedManagementNumbers(new Set());
    setSelectedManagers(new Set());
    setSelectedClients(new Set());
    setSelectedProjectNumbers(new Set());
    setSelectedCompletionMonths(new Set());
    setFilterSearchQuery("");
  }, []);

  // フィルターが適用されているか
  const isFiltered =
    selectedManagementNumbers.size > 0 ||
    selectedManagers.size > 0 ||
    selectedClients.size > 0 ||
    selectedProjectNumbers.size > 0 ||
    selectedCompletionMonths.size > 0;

  const filters: ProjectFilters = {
    selectedManagementNumbers,
    selectedManagers,
    selectedClients,
    selectedProjectNumbers,
    selectedCompletionMonths,
    filterSearchQuery,
  };

  return {
    filters,
    filterOpen,
    setFilterOpen,
    setFilterSearchQuery,
    selectedManagementNumbers,
    selectedManagers,
    selectedClients,
    selectedProjectNumbers,
    selectedCompletionMonths,
    setSelectedManagementNumbers,
    setSelectedManagers,
    setSelectedClients,
    setSelectedProjectNumbers,
    setSelectedCompletionMonths,
    uniqueManagementNumbers,
    uniqueManagers,
    uniqueClients,
    uniqueProjectNumbers,
    uniqueCompletionMonths,
    toggleSelection,
    selectAll,
    clearAll,
    clearAllFilters,
    getFilteredOptions,
    isFiltered,
  };
}
