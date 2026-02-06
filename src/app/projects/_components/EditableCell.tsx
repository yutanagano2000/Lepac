"use client";

import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Project } from "@/db/schema";

type ProjectWithOverdue = Project & { hasOverdue: boolean };

interface EditableCellProps {
  project: ProjectWithOverdue;
  columnKey: string;
  className?: string;
  isEditMode: boolean;
  editingCell: { projectId: number; columnKey: string } | null;
  editingValue: string;
  setEditingValue: (value: string) => void;
  handleCellKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  saveEditCell: () => void;
  isSaving: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  startEditCell: (projectId: number, columnKey: string, currentValue: string) => void;
  getCellValue: (project: ProjectWithOverdue, key: string) => string;
  getRawCellValue: (project: ProjectWithOverdue, key: string) => string;
}

export function EditableCell({
  project,
  columnKey,
  className,
  isEditMode,
  editingCell,
  editingValue,
  setEditingValue,
  handleCellKeyDown,
  saveEditCell,
  isSaving,
  inputRef,
  startEditCell,
  getCellValue,
  getRawCellValue,
}: EditableCellProps) {
  if (editingCell?.projectId === project.id && editingCell?.columnKey === columnKey) {
    return (
      <Input
        ref={inputRef}
        value={editingValue}
        onChange={(e) => setEditingValue(e.target.value)}
        onKeyDown={handleCellKeyDown}
        onBlur={saveEditCell}
        className="h-8 text-sm min-w-[100px]"
        disabled={isSaving}
      />
    );
  }
  return (
    <div
      className={cn(
        isEditMode && "cursor-text hover:bg-muted/50 px-1 py-0.5 rounded min-h-[24px]",
        className,
      )}
      onClick={(e) => {
        if (isEditMode) {
          e.stopPropagation();
          startEditCell(project.id, columnKey, getRawCellValue(project, columnKey));
        }
      }}
    >
      {columnKey === "managementNumber" && project.hasOverdue && (
        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 inline mr-1" />
      )}
      {getCellValue(project, columnKey)}
    </div>
  );
}
