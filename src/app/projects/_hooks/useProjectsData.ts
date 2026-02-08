"use client";

import { useState, useMemo, useCallback } from "react";
import type { ProjectWithOverdue, ProjectFilters } from "../_types";

interface UseProjectsDataReturn {
  projects: ProjectWithOverdue[];
  filteredProjects: ProjectWithOverdue[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  fetchProjects: () => void;
  setProjects: React.Dispatch<React.SetStateAction<ProjectWithOverdue[]>>;
  updateLocalProject: (projectId: number, columnKey: string, value: string | null) => void;
}

export function useProjectsData(
  initialProjects: ProjectWithOverdue[],
  filters: ProjectFilters
): UseProjectsDataReturn {
  const [projects, setProjects] = useState<ProjectWithOverdue[]>(initialProjects);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProjects = useCallback(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((res) => res.json())
      .then(setProjects)
      .catch((err) => {
        console.error("案件一覧の取得に失敗しました:", err);
      });
  }, []);

  // ローカルステート更新（セル編集用）
  const updateLocalProject = useCallback((projectId: number, columnKey: string, value: string | null) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, [columnKey]: value } : p))
    );
  }, []);

  // 検索フィルタリング + チェックボックスフィルタ
  const filteredProjects = useMemo(() => {
    let result = projects;

    // テキスト検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((project) => {
        const addr = (project.address ?? "").toLowerCase();
        const l1 = (project.landowner1 ?? "").toLowerCase();
        const l2 = (project.landowner2 ?? "").toLowerCase();
        const l3 = (project.landowner3 ?? "").toLowerCase();
        const commentText = (project.commentSearchText ?? "").toLowerCase();
        const todoText = (project.todoSearchText ?? "").toLowerCase();
        return (
          project.managementNumber.toLowerCase().includes(query) ||
          project.projectNumber.toLowerCase().includes(query) ||
          addr.includes(query) ||
          l1.includes(query) ||
          l2.includes(query) ||
          l3.includes(query) ||
          commentText.includes(query) ||
          todoText.includes(query)
        );
      });
    }

    // チェックボックスフィルター
    if (filters.selectedManagementNumbers.size > 0) {
      result = result.filter((p) => filters.selectedManagementNumbers.has(p.managementNumber));
    }
    if (filters.selectedManagers.size > 0) {
      result = result.filter((p) => filters.selectedManagers.has(p.manager));
    }
    if (filters.selectedClients.size > 0) {
      result = result.filter((p) => filters.selectedClients.has(p.client));
    }
    if (filters.selectedProjectNumbers.size > 0) {
      result = result.filter((p) => filters.selectedProjectNumbers.has(p.projectNumber));
    }
    if (filters.selectedCompletionMonths.size > 0) {
      result = result.filter((p) =>
        filters.selectedCompletionMonths.has(p.completionMonth || "未設定")
      );
    }

    return result;
  }, [projects, searchQuery, filters]);

  return {
    projects,
    filteredProjects,
    searchQuery,
    setSearchQuery,
    fetchProjects,
    setProjects,
    updateLocalProject,
  };
}
