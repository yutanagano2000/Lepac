"use client";

import { useState, useCallback } from "react";
import type { FolderInfo, ImportResult } from "../_types";
import { extractCompletionMonth } from "../_utils";

interface UseImportActionsProps {
  folders: FolderInfo[];
}

export function useImportActions({ folders }: UseImportActionsProps) {
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(
    new Set()
  );
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const toggleFolder = useCallback((folderName: string) => {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const validFolders = folders.filter(
      (f) => f.managementNumber && f.projectNumber
    );
    setSelectedFolders(new Set(validFolders.map((f) => f.folderName)));
  }, [folders]);

  const clearSelection = useCallback(() => {
    setSelectedFolders(new Set());
  }, []);

  const handleImport = useCallback(async () => {
    setShowConfirmDialog(false);
    setImporting(true);
    setImportResults([]);

    const results: ImportResult[] = [];

    for (const folderName of selectedFolders) {
      const folder = folders.find((f) => f.folderName === folderName);
      if (!folder || !folder.managementNumber || !folder.projectNumber) {
        results.push({
          success: false,
          folderName,
          error: "フォルダ情報が不完全です",
        });
        continue;
      }

      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            managementNumber: folder.managementNumber,
            manager: folder.manager || "",
            projectNumber: folder.projectNumber,
            client: "",
            completionMonth: extractCompletionMonth(folder.note),
          }),
        });

        if (res.ok) {
          results.push({ success: true, folderName });
        } else {
          const data = await res.json();
          results.push({
            success: false,
            folderName,
            error: data.error || "登録に失敗しました",
          });
        }
      } catch {
        results.push({ success: false, folderName, error: "通信エラー" });
      }
    }

    setImportResults(results);
    setImporting(false);

    // 成功したものを選択から除外
    const successFolders = new Set(
      results.filter((r) => r.success).map((r) => r.folderName)
    );
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      successFolders.forEach((f) => next.delete(f));
      return next;
    });
  }, [folders, selectedFolders]);

  const successCount = importResults.filter((r) => r.success).length;
  const failureCount = importResults.filter((r) => !r.success).length;

  return {
    selectedFolders,
    importing,
    importResults,
    showConfirmDialog,
    setShowConfirmDialog,
    toggleFolder,
    selectAll,
    clearSelection,
    handleImport,
    successCount,
    failureCount,
  };
}
