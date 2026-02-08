"use client";

import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { TABLE_COLUMNS } from "../_constants";
import type { ProjectWithOverdue, CellEditState } from "../_types";
import { FilterableHeader } from "./FilterableHeader";
import { getCellValue, getRawCellValue } from "./utils";

interface ProjectsTableProps {
  filteredProjects: ProjectWithOverdue[];
  searchQuery: string;
  // 編集モード
  isEditMode: boolean;
  editingCell: CellEditState | null;
  editingValue: string;
  isSaving: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  startEditCell: (projectId: number, columnKey: string, currentValue: string) => void;
  handleCellKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  saveEditCell: () => void;
  setEditingValue: (value: string) => void;
  // フィルター
  filterOpen: string | null;
  setFilterOpen: (key: string | null) => void;
  filterSearchQuery: string;
  setFilterSearchQuery: (query: string) => void;
  uniqueManagementNumbers: string[];
  uniqueManagers: string[];
  uniqueClients: string[];
  uniqueProjectNumbers: string[];
  uniqueCompletionMonths: string[];
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
  getFilteredOptions: (options: string[], searchQuery: string) => string[];
}

export function ProjectsTable({
  filteredProjects,
  searchQuery,
  isEditMode,
  editingCell,
  editingValue,
  isSaving,
  inputRef,
  startEditCell,
  handleCellKeyDown,
  saveEditCell,
  setEditingValue,
  filterOpen,
  setFilterOpen,
  filterSearchQuery,
  setFilterSearchQuery,
  uniqueManagementNumbers,
  uniqueManagers,
  uniqueClients,
  uniqueProjectNumbers,
  uniqueCompletionMonths,
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
  toggleSelection,
  selectAll,
  clearAll,
  getFilteredOptions,
}: ProjectsTableProps) {
  const router = useRouter();

  // 共通のフィルターヘッダーprops
  const filterHeaderProps = {
    filterOpen,
    setFilterOpen,
    filterSearchQuery,
    setFilterSearchQuery,
    toggleSelection,
    selectAll,
    clearAll,
    getFilteredOptions,
  };

  // セルコンポーネント
  const EditableCell = ({
    project,
    columnKey,
    className,
  }: {
    project: ProjectWithOverdue;
    columnKey: string;
    className?: string;
  }) => {
    const isEditing = editingCell?.projectId === project.id && editingCell?.columnKey === columnKey;

    if (isEditing) {
      return (
        <Input
          ref={inputRef}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={handleCellKeyDown}
          onBlur={saveEditCell}
          className="h-8 text-sm"
          disabled={isSaving}
        />
      );
    }

    return (
      <div
        className={cn(
          isEditMode && "cursor-text hover:bg-muted/50 px-1 py-0.5 rounded",
          className
        )}
        onClick={(e) => {
          if (isEditMode) {
            e.stopPropagation();
            startEditCell(project.id, columnKey, getRawCellValue(project, columnKey));
          }
        }}
      >
        {columnKey === "managementNumber" ? (
          <div className="flex items-center gap-2">
            {project.hasOverdue && (
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            )}
            <span className="truncate">{project.managementNumber}</span>
          </div>
        ) : (
          getCellValue(project, columnKey)
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex">
          {/* 固定カラム部分（管理番号、担当、販売先、販売店案件番号） */}
          <div className="flex-shrink-0 border-r border-border bg-background z-10">
            <Table>
              <TableHeader>
                <TableRow className="h-12 bg-muted/30">
                  <TableHead className="px-1 bg-muted/30" style={{ minWidth: "120px" }}>
                    <FilterableHeader
                      columnKey="managementNumber"
                      label="管理番号"
                      options={uniqueManagementNumbers}
                      selected={selectedManagementNumbers}
                      setSelected={setSelectedManagementNumbers}
                      {...filterHeaderProps}
                    />
                  </TableHead>
                  <TableHead className="px-1 bg-muted/30" style={{ minWidth: "80px" }}>
                    <FilterableHeader
                      columnKey="manager"
                      label="担当"
                      options={uniqueManagers}
                      selected={selectedManagers}
                      setSelected={setSelectedManagers}
                      {...filterHeaderProps}
                    />
                  </TableHead>
                  <TableHead className="px-1 bg-muted/30" style={{ minWidth: "120px" }}>
                    <FilterableHeader
                      columnKey="client"
                      label="販売先"
                      options={uniqueClients}
                      selected={selectedClients}
                      setSelected={setSelectedClients}
                      {...filterHeaderProps}
                    />
                  </TableHead>
                  <TableHead className="px-1 bg-muted/30" style={{ minWidth: "140px" }}>
                    <FilterableHeader
                      columnKey="projectNumber"
                      label="販売店 案件番号"
                      options={uniqueProjectNumbers}
                      selected={selectedProjectNumbers}
                      setSelected={setSelectedProjectNumbers}
                      {...filterHeaderProps}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow className="h-16">
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground text-sm py-8"
                    >
                      {searchQuery ? "検索結果がありません" : "案件がありません"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow
                      key={project.id}
                      className={cn("h-12", !isEditMode && "cursor-pointer hover:bg-muted/50")}
                      onClick={() => {
                        if (!isEditMode) {
                          router.push(`/projects/${project.id}`);
                        }
                      }}
                    >
                      <TableCell className="font-medium text-sm py-2 px-2 bg-background">
                        <EditableCell project={project} columnKey="managementNumber" />
                      </TableCell>
                      <TableCell className="text-sm py-2 px-2 bg-background">
                        <EditableCell project={project} columnKey="manager" />
                      </TableCell>
                      <TableCell className="text-sm py-2 px-2 bg-background">
                        <EditableCell project={project} columnKey="client" />
                      </TableCell>
                      <TableCell className="text-sm py-2 px-2 bg-background">
                        <EditableCell project={project} columnKey="projectNumber" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* スクロール可能カラム部分 */}
          <ScrollArea className="flex-1">
            <div className="min-w-max">
              <Table>
                <TableHeader>
                  <TableRow className="h-12 bg-muted/30">
                    {/* 残りのカラム（フィルターなし） */}
                    {TABLE_COLUMNS.slice(4, -1).map((col) => (
                      <TableHead
                        key={col.key}
                        className="px-2 whitespace-nowrap text-xs font-semibold bg-muted/30"
                        style={{ minWidth: col.width }}
                      >
                        {col.label}
                      </TableHead>
                    ))}
                    {/* 完成月（フィルター付き） */}
                    <TableHead className="px-1 bg-muted/30" style={{ minWidth: "100px" }}>
                      <FilterableHeader
                        columnKey="completionMonth"
                        label="完成月"
                        options={uniqueCompletionMonths}
                        selected={selectedCompletionMonths}
                        setSelected={setSelectedCompletionMonths}
                        {...filterHeaderProps}
                      />
                    </TableHead>
                    {/* 完工 */}
                    <TableHead
                      className="px-2 whitespace-nowrap text-xs font-semibold bg-muted/30"
                      style={{ minWidth: "60px" }}
                    >
                      完工
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.length === 0 ? (
                    <TableRow className="h-16">
                      <TableCell
                        colSpan={TABLE_COLUMNS.length - 4}
                        className="text-center text-muted-foreground text-sm py-8"
                      >
                        &nbsp;
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map((project) => (
                      <TableRow key={project.id} className="h-12 hover:bg-muted/50">
                        {TABLE_COLUMNS.slice(4).map((col) => (
                          <TableCell
                            key={col.key}
                            className="text-sm py-2 px-2 whitespace-nowrap"
                          >
                            {editingCell?.projectId === project.id &&
                            editingCell?.columnKey === col.key ? (
                              <Input
                                ref={inputRef}
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleCellKeyDown}
                                onBlur={saveEditCell}
                                className="h-8 text-sm min-w-[100px]"
                                disabled={isSaving}
                              />
                            ) : (
                              <div
                                className={cn(
                                  isEditMode &&
                                    "cursor-text hover:bg-muted/50 px-1 py-0.5 rounded min-h-[24px]"
                                )}
                                onClick={(e) => {
                                  if (isEditMode) {
                                    e.stopPropagation();
                                    startEditCell(project.id, col.key, getRawCellValue(project, col.key));
                                  }
                                }}
                              >
                                {getCellValue(project, col.key)}
                              </div>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
