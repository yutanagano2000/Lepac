"use client";

import { useState, useCallback, useRef } from "react";
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { TaskCardData } from "./TaskCard";
import type { PhaseOverrides, ProjectPhaseOverrides } from "./types";
import { WORKFLOW_PHASES } from "@/lib/timeline";

// フェーズのインデックスマップ（隣接チェック用）
const PHASE_INDEX_MAP = new Map<string, number>(
  WORKFLOW_PHASES.map((p, i) => [p.key, i])
);

// カラムIDプレフィックス（droppable と sortable の ID 衝突回避）
export const COLUMN_PREFIX = "column:";

/** 隣接フェーズかチェック（1つ前 or 1つ後） */
function isAdjacentPhase(fromKey: string, toKey: string): boolean {
  const fromIdx = PHASE_INDEX_MAP.get(fromKey);
  const toIdx = PHASE_INDEX_MAP.get(toKey);
  if (fromIdx == null || toIdx == null) return false;
  return Math.abs(fromIdx - toIdx) === 1;
}

/** ID からカラムキーを取得（"column:xxx" → "xxx"） */
function stripColumnPrefix(id: string): string | null {
  if (id.startsWith(COLUMN_PREFIX)) return id.slice(COLUMN_PREFIX.length);
  return null;
}

/** デフォルトのサブフェーズキー配列を取得 */
function getDefaultSubPhaseKeys(phaseKey: string): string[] {
  const phase = WORKFLOW_PHASES.find((p) => p.key === phaseKey);
  if (!phase || !("subPhases" in phase) || !phase.subPhases) return [];
  return phase.subPhases.map((sp) => sp.key);
}

/** 各サブフェーズの元フェーズを返すマップ */
const ORIGINAL_PHASE_MAP = new Map<string, string>();
for (const wp of WORKFLOW_PHASES) {
  if ("subPhases" in wp && wp.subPhases) {
    for (const sp of wp.subPhases) {
      ORIGINAL_PHASE_MAP.set(sp.key, wp.key);
    }
  }
}

export interface KanbanColumns {
  [phaseKey: string]: TaskCardData[];
}

interface UseKanbanDndOptions {
  initialColumns: KanbanColumns;
  currentOverrides: PhaseOverrides;
  onSave: (overrides: ProjectPhaseOverrides) => Promise<void>;
}

export function useKanbanDnd({
  initialColumns,
  currentOverrides,
  onSave,
}: UseKanbanDndOptions) {
  const [columns, setColumns] = useState<KanbanColumns>(initialColumns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<TaskCardData | null>(null);

  // stale closure 回避: 常に最新の値を ref で保持
  const columnsRef = useRef<KanbanColumns>(initialColumns);
  const isDraggingRef = useRef(false);
  const overridesRef = useRef(currentOverrides);
  overridesRef.current = currentOverrides;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // setState と ref を同時に更新するヘルパー
  const updateColumns = useCallback((updater: (prev: KanbanColumns) => KanbanColumns) => {
    setColumns((prev) => {
      const next = updater(prev);
      columnsRef.current = next;
      return next;
    });
  }, []);

  // 外部からの同期（phases 変更時）— ドラッグ中はブロック
  const syncColumns = useCallback(
    (newColumns: KanbanColumns) => {
      if (isDraggingRef.current) return;
      columnsRef.current = newColumns;
      setColumns(newColumns);
    },
    []
  );

  /** taskId が所属するカラムキーを検索 */
  const findColumnForTask = useCallback((taskId: string): string | null => {
    const cols = columnsRef.current;
    for (const [phaseKey, tasks] of Object.entries(cols)) {
      if (tasks.some((t) => t.id === taskId)) return phaseKey;
    }
    return null;
  }, []);

  /** overIdStr からドロップ先のカラムキーを解決 */
  const resolveOverColumn = useCallback((overIdStr: string): string | null => {
    // カラムIDの場合
    const colKey = stripColumnPrefix(overIdStr);
    if (colKey && columnsRef.current[colKey]) return colKey;
    // タスクIDの場合 → そのタスクが属するカラム
    return findColumnForTask(overIdStr);
  }, [findColumnForTask]);

  // --- DnD ハンドラ ---

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = event.active.id as string;
      isDraggingRef.current = true;
      setActiveId(id);
      for (const tasks of Object.values(columnsRef.current)) {
        const task = tasks.find((t) => t.id === id);
        if (task) {
          setActiveTask(task);
          break;
        }
      }
    },
    []
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeIdStr = active.id as string;
      const overIdStr = over.id as string;

      const activeColumn = findColumnForTask(activeIdStr);
      const overColumn = resolveOverColumn(overIdStr);

      if (!activeColumn || !overColumn || activeColumn === overColumn) return;
      if (overColumn === "construction") return;
      if (!isAdjacentPhase(activeColumn, overColumn)) return;

      // クロスコンテナ移動
      updateColumns((prev) => {
        const activeTasks = [...(prev[activeColumn] ?? [])];
        const overTasks = [...(prev[overColumn] ?? [])];

        const activeIdx = activeTasks.findIndex((t) => t.id === activeIdStr);
        if (activeIdx === -1) return prev;

        const [movedTask] = activeTasks.splice(activeIdx, 1);
        const updatedTask = { ...movedTask, phaseKey: overColumn };

        // 挿入位置: over先がタスクならその位置、カラムなら末尾
        const overTaskIdx = overTasks.findIndex((t) => t.id === overIdStr);
        if (overTaskIdx >= 0) {
          overTasks.splice(overTaskIdx, 0, updatedTask);
        } else {
          overTasks.push(updatedTask);
        }

        return {
          ...prev,
          [activeColumn]: activeTasks,
          [overColumn]: overTasks,
        };
      });
    },
    [findColumnForTask, resolveOverColumn, updateColumns]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setActiveTask(null);
      isDraggingRef.current = false;

      if (!over) return;

      const activeIdStr = active.id as string;
      const overIdStr = over.id as string;

      // ref から最新の columns を読み取り（stale closure 回避の核心）
      const currentCols = columnsRef.current;

      const activeColumn = (() => {
        for (const [k, tasks] of Object.entries(currentCols)) {
          if (tasks.some((t) => t.id === activeIdStr)) return k;
        }
        return null;
      })();

      const overColumn = (() => {
        const colKey = stripColumnPrefix(overIdStr);
        if (colKey && currentCols[colKey]) return colKey;
        for (const [k, tasks] of Object.entries(currentCols)) {
          if (tasks.some((t) => t.id === overIdStr)) return k;
        }
        return null;
      })();

      if (!activeColumn || !overColumn) return;

      // 同カラム内の並べ替え（handleDragOver では処理されないため、ここで処理）
      if (activeColumn === overColumn) {
        updateColumns((prev) => {
          const tasks = [...(prev[activeColumn] ?? [])];
          const oldIdx = tasks.findIndex((t) => t.id === activeIdStr);
          const newIdx = tasks.findIndex((t) => t.id === overIdStr);
          if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
          const reordered = arrayMove(tasks, oldIdx, newIdx);
          return { ...prev, [activeColumn]: reordered };
        });
      }

      // --- overrides を構築して保存 ---
      // updateColumns の functional update が同期的に ref を更新済み
      const finalCols = columnsRef.current;
      const updatedPhaseOverrides: PhaseOverrides = { ...overridesRef.current };
      const taskAssignments: Record<string, string> = {};

      for (const [phaseKey, tasks] of Object.entries(finalCols)) {
        const taskKeys = tasks.map((t) => t.id);
        const defaultKeys = getDefaultSubPhaseKeys(phaseKey);
        const isReordered =
          taskKeys.length !== defaultKeys.length ||
          taskKeys.some((k, i) => k !== defaultKeys[i]);

        if (isReordered && taskKeys.length > 0) {
          updatedPhaseOverrides[phaseKey] = {
            ...updatedPhaseOverrides[phaseKey],
            subPhaseOrder: taskKeys,
          };
        }

        // フェーズ間移動のトラッキング
        for (const task of tasks) {
          const originalPhase = ORIGINAL_PHASE_MAP.get(task.id);
          if (originalPhase && originalPhase !== phaseKey) {
            taskAssignments[task.id] = phaseKey;
          }
        }
      }

      const projectOverrides: ProjectPhaseOverrides = {
        phases: updatedPhaseOverrides,
        ...(Object.keys(taskAssignments).length > 0 && { taskAssignments }),
      };

      try {
        await onSaveRef.current(projectOverrides);
      } catch (err) {
        console.error("Failed to save kanban overrides:", err);
      }
    },
    [updateColumns]
  );

  return {
    columns,
    activeId,
    activeTask,
    syncColumns,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
