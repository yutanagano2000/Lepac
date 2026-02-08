"use client";

import { useState, useCallback, useRef } from "react";
import type { CellEditState, ProjectWithOverdue } from "../_types";

interface UseCellEditingReturn {
  isEditMode: boolean;
  editingCell: CellEditState | null;
  editingValue: string;
  isSaving: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  toggleEditMode: () => void;
  startEditCell: (projectId: number, columnKey: string, currentValue: string) => void;
  saveEditCell: () => Promise<void>;
  cancelEditCell: () => void;
  handleCellKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  setEditingValue: (value: string) => void;
}

interface UseCellEditingOptions {
  projects: ProjectWithOverdue[];
  onUpdate: (projectId: number, columnKey: string, value: string | null) => void;
}

export function useCellEditing({ projects, onUpdate }: UseCellEditingOptions): UseCellEditingReturn {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState<CellEditState | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // セル編集開始
  const startEditCell = useCallback(
    (projectId: number, columnKey: string, currentValue: string) => {
      if (!isEditMode) return;
      setEditingCell({ projectId, columnKey });
      setEditingValue(currentValue === "-" ? "" : currentValue);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [isEditMode]
  );

  // セル編集保存
  const saveEditCell = useCallback(async () => {
    if (!editingCell) return;

    setIsSaving(true);
    try {
      const project = projects.find((p) => p.id === editingCell.projectId);
      if (!project) return;

      const updateData = {
        ...project,
        [editingCell.columnKey]: editingValue || null,
      };

      const res = await fetch(`/api/projects/${editingCell.projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        onUpdate(editingCell.projectId, editingCell.columnKey, editingValue || null);
      }
    } catch (error) {
      console.error("Failed to save cell:", error);
    } finally {
      setIsSaving(false);
      setEditingCell(null);
      setEditingValue("");
    }
  }, [editingCell, editingValue, projects, onUpdate]);

  // セル編集キャンセル
  const cancelEditCell = useCallback(() => {
    setEditingCell(null);
    setEditingValue("");
  }, []);

  // キーボードイベント処理
  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveEditCell();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEditCell();
      } else if (e.key === "Tab") {
        e.preventDefault();
        saveEditCell();
      }
    },
    [saveEditCell, cancelEditCell]
  );

  // 編集モード切り替え
  const toggleEditMode = useCallback(() => {
    if (isEditMode) {
      cancelEditCell();
    }
    setIsEditMode((prev) => !prev);
  }, [isEditMode, cancelEditCell]);

  return {
    isEditMode,
    editingCell,
    editingValue,
    isSaving,
    inputRef,
    toggleEditMode,
    startEditCell,
    saveEditCell,
    cancelEditCell,
    handleCellKeyDown,
    setEditingValue,
  };
}
