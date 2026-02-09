"use client";

import { useState, useCallback } from "react";
import type { FolderInfo } from "../_types";

export function useImportData() {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const res = await fetch("/api/filesystem?action=listAllProjects");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "フォルダ一覧の取得に失敗しました");
        return;
      }

      setFolders(data.folders);
    } catch {
      setError("ファイルサーバーに接続できません");
    } finally {
      setLoading(false);
    }
  }, []);

  const validFoldersCount = folders.filter(
    (f) => f.managementNumber && f.projectNumber
  ).length;

  return {
    folders,
    loading,
    error,
    hasFetched,
    fetchFolders,
    validFoldersCount,
  };
}
