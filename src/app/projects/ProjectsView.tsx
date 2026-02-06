"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search, Loader2, Check, FolderInput, CheckCircle2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Project, NewProject } from "@/db/schema";
import { MONTHS, MANAGER_OPTIONS, TABLE_COLUMNS, getRecentSearches, addRecentSearch } from "./_constants";
import { EditableCell } from "./_components/EditableCell";

type ProjectWithOverdue = Project & { hasOverdue: boolean };

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface ProjectsViewProps {
  initialProjects: ProjectWithOverdue[];
  initialPagination: PaginationInfo;
}

// 固定カラム数（管理番号、担当、販売先、販売店案件番号）
const FIXED_COLUMNS_COUNT = 4;

export default function ProjectsView({ initialProjects, initialPagination }: ProjectsViewProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithOverdue[]>(initialProjects);
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
  const [isLoading, setIsLoading] = useState(false);

  // ダイアログ系
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<NewProject>({
    managementNumber: "",
    manager: "",
    client: "",
    projectNumber: "",
    completionMonth: "",
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editCalendarOpen, setEditCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 検索
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ソート
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // 編集モード
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState<{ projectId: number; columnKey: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // インポート
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importableFolders, setImportableFolders] = useState<{ folderName: string; managementNumber: string; manager: string; projectNumber: string }[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());

  // ── API経由でデータ取得 ──
  const fetchPage = useCallback(async (page: number, query?: string, sort?: "asc" | "desc") => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
        sort: sort ?? sortOrder,
      });
      const q = query ?? searchQuery;
      if (q) params.set("q", q);

      const res = await fetch(`/api/projects?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("案件一覧の取得に失敗:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit, sortOrder, searchQuery]);

  // 検索（デバウンス 400ms）
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value.trim());
      fetchPage(1, value.trim());
    }, 400);
  };

  // ソート切替
  const toggleSort = () => {
    const next = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(next);
    fetchPage(pagination.page, undefined, next);
  };

  // ページ遷移
  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchPage(page);
  };

  // 初期化
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const handleSearchFocus = () => setShowSuggestions(true);
  const handleSearchBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
    const q = searchInput.trim();
    if (q) setRecentSearches(addRecentSearch(q));
  };
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const q = searchInput.trim();
      if (q) setRecentSearches(addRecentSearch(q));
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      setSearchQuery(q);
      fetchPage(1, q);
    }
  };
  const handleSuggestionClick = (text: string) => {
    setSearchInput(text);
    setSearchQuery(text);
    setRecentSearches(addRecentSearch(text));
    setShowSuggestions(false);
    fetchPage(1, text);
  };

  // ── インポート ──
  const fetchImportableFolders = async () => {
    setImportLoading(true);
    try {
      const res = await fetch("/api/projects/import");
      if (res.ok) {
        const data = await res.json();
        setImportableFolders(data.importable || []);
        setSelectedFolders(new Set());
      }
    } catch (error) {
      console.error("Failed to fetch importable folders:", error);
    } finally {
      setImportLoading(false);
    }
  };

  const handleImport = async () => {
    if (selectedFolders.size === 0) return;
    const foldersToImport = importableFolders.filter(f => selectedFolders.has(f.folderName));
    setImportSubmitting(true);
    try {
      const res = await fetch("/api/projects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folders: foldersToImport }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        setImportOpen(false);
        fetchPage(1);
      } else {
        const data = await res.json();
        alert(data.error || "インポートに失敗しました");
      }
    } catch (error) {
      console.error("Import error:", error);
      alert("インポートに失敗しました");
    } finally {
      setImportSubmitting(false);
    }
  };

  // ── CRUD ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.manager?.trim()) {
      alert("担当を選択してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ managementNumber: "", manager: "", client: "", projectNumber: "", completionMonth: "" });
      setOpen(false);
      fetchPage(pagination.page);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    await fetch(`/api/projects/${editingProject.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingProject),
    });
    setEditOpen(false);
    setEditingProject(null);
    fetchPage(pagination.page);
  };

  const openEditDialog = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject({ ...project });
    setEditOpen(true);
    if (project.completionMonth) {
      const [year] = project.completionMonth.split("-");
      setCalendarYear(parseInt(year, 10));
    } else {
      setCalendarYear(new Date().getFullYear());
    }
  };

  const openDeleteDialog = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingProject(project);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    await fetch(`/api/projects/${deletingProject.id}`, { method: "DELETE" });
    setDeleteOpen(false);
    setDeletingProject(null);
    fetchPage(pagination.page);
  };

  const selectMonth = (monthIndex: number) => {
    const monthStr = `${calendarYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    setForm({ ...form, completionMonth: monthStr });
    setCalendarOpen(false);
  };

  const selectEditMonth = (monthIndex: number) => {
    if (!editingProject) return;
    const monthStr = `${calendarYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    setEditingProject({ ...editingProject, completionMonth: monthStr });
    setEditCalendarOpen(false);
  };

  const formatCompletionMonth = (value: string | null | undefined) => {
    if (!value) return "";
    const [year, month] = value.split("-");
    return `${year}年${parseInt(month, 10)}月`;
  };

  // ── セル値ヘルパー ──
  const getCellValue = (project: ProjectWithOverdue, key: string): string => {
    const value = (project as Record<string, unknown>)[key];
    if (value === null || value === undefined) return "-";
    if (key === "completionMonth") return formatCompletionMonth(value as string) || "-";
    return String(value);
  };

  const getRawCellValue = (project: ProjectWithOverdue, key: string): string => {
    const value = (project as Record<string, unknown>)[key];
    if (value === null || value === undefined) return "";
    return String(value);
  };

  // ── セル編集 ──
  const startEditCell = useCallback((projectId: number, columnKey: string, currentValue: string) => {
    if (!isEditMode) return;
    setEditingCell({ projectId, columnKey });
    setEditingValue(currentValue === "-" ? "" : currentValue);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [isEditMode]);

  const saveEditCell = useCallback(async () => {
    if (!editingCell) return;
    setIsSaving(true);
    try {
      const project = projects.find(p => p.id === editingCell.projectId);
      if (!project) return;
      const updateData = { ...project, [editingCell.columnKey]: editingValue || null };
      const res = await fetch(`/api/projects/${editingCell.projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        setProjects(prev => prev.map(p =>
          p.id === editingCell.projectId ? { ...p, [editingCell.columnKey]: editingValue || null } : p
        ));
      }
    } catch (error) {
      console.error("Failed to save cell:", error);
    } finally {
      setIsSaving(false);
      setEditingCell(null);
      setEditingValue("");
    }
  }, [editingCell, editingValue, projects]);

  const cancelEditCell = useCallback(() => {
    setEditingCell(null);
    setEditingValue("");
  }, []);

  const handleCellKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); saveEditCell(); }
    else if (e.key === "Escape") { e.preventDefault(); cancelEditCell(); }
    else if (e.key === "Tab") { e.preventDefault(); saveEditCell(); }
  }, [saveEditCell, cancelEditCell]);

  const toggleEditMode = useCallback(() => {
    if (isEditMode) cancelEditCell();
    setIsEditMode(prev => !prev);
  }, [isEditMode, cancelEditCell]);

  // ── EditableCell ラッパー ──
  const renderEditableCell = (project: ProjectWithOverdue, columnKey: string, className?: string) => (
    <EditableCell
      project={project}
      columnKey={columnKey}
      className={className}
      isEditMode={isEditMode}
      editingCell={editingCell}
      editingValue={editingValue}
      setEditingValue={setEditingValue}
      handleCellKeyDown={handleCellKeyDown}
      saveEditCell={saveEditCell}
      isSaving={isSaving}
      inputRef={inputRef}
      startEditCell={startEditCell}
      getCellValue={getCellValue}
      getRawCellValue={getRawCellValue}
    />
  );

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <div className="py-6 sm:py-10">
        <div className="space-y-4 sm:space-y-6">
          {/* ヘッダー */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="space-y-1 shrink-0">
              <h1 className="text-lg sm:text-2xl font-semibold">案件一覧</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {pagination.totalCount}件中 {(pagination.page - 1) * pagination.limit + 1}〜{Math.min(pagination.page * pagination.limit, pagination.totalCount)}件を表示
              </p>
            </div>

            {/* 検索欄 */}
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
              <Input
                placeholder="管理番号・案件番号・地権者・住所で検索"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 h-9 sm:h-10 text-sm bg-muted/50 border-0 focus-visible:ring-2 rounded-lg"
              />
              {showSuggestions && recentSearches.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border border-border bg-card shadow-lg overflow-hidden"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <p className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border bg-muted/30">
                    最近の検索
                  </p>
                  <ul className="py-1">
                    {recentSearches.map((text) => (
                      <li key={text}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                          onMouseDown={() => handleSuggestionClick(text)}
                        >
                          {text}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Button size="sm" variant={isEditMode ? "default" : "outline"} onClick={toggleEditMode}
              className={cn(isEditMode && "bg-primary text-primary-foreground")}>
              {isEditMode ? <><Check className="h-4 w-4" /> 編集完了</> : <><Pencil className="h-4 w-4" /> 編集</>}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" /> 新規登録</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>案件を新規登録</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="managementNumber">管理番号</Label>
                    <Input id="managementNumber" value={form.managementNumber} onChange={(e) => setForm({ ...form, managementNumber: e.target.value })} placeholder="例: P-001" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager">担当</Label>
                    <Select value={form.manager || undefined} onValueChange={(value) => setForm({ ...form, manager: value })}>
                      <SelectTrigger id="manager" className="w-full"><SelectValue placeholder="選択してください" /></SelectTrigger>
                      <SelectContent>{MANAGER_OPTIONS.map((name) => (<SelectItem key={name} value={name}>{name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">販売先</Label>
                    <Input id="client" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="例: 〇〇不動産" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectNumber">案件番号</Label>
                    <Input id="projectNumber" value={form.projectNumber} onChange={(e) => setForm({ ...form, projectNumber: e.target.value })} placeholder="例: 2026-0001" required />
                  </div>
                  <div className="space-y-2">
                    <Label>完成月</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.completionMonth ? formatCompletionMonth(form.completionMonth) : "選択してください"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3">
                        <div className="flex items-center justify-between mb-3">
                          <Button type="button" variant="ghost" size="icon" onClick={() => setCalendarYear(calendarYear - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                          <span className="font-medium">{calendarYear}年</span>
                          <Button type="button" variant="ghost" size="icon" onClick={() => setCalendarYear(calendarYear + 1)}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {MONTHS.map((month, index) => (<Button key={month} type="button" variant="ghost" size="sm" className="h-9" onClick={() => selectMonth(index)}>{month}</Button>))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>キャンセル</Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />登録中...</> : "登録"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Button size="sm" variant="outline" onClick={() => { setImportOpen(true); fetchImportableFolders(); }}>
              <FolderInput className="h-4 w-4" /> 一括取込
            </Button>
          </div>

          {/* インポートダイアログ */}
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>フォルダから案件を取込</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {importLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground">読み込み中...</span></div>
                ) : importableFolders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" /><p>すべての案件が登録済みです</p></div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>未登録の案件フォルダ: {importableFolders.length}件</span>
                      <Button variant="ghost" size="sm" onClick={() => {
                        if (selectedFolders.size === importableFolders.length) setSelectedFolders(new Set());
                        else setSelectedFolders(new Set(importableFolders.map(f => f.folderName)));
                      }}>{selectedFolders.size === importableFolders.length ? "全解除" : "全選択"}</Button>
                    </div>
                    <ScrollArea className="h-[300px] border rounded-lg">
                      <div className="p-2 space-y-1">
                        {importableFolders.map((folder) => (
                          <label key={folder.folderName} className={cn("flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors", selectedFolders.has(folder.folderName) ? "bg-primary/10 border border-primary" : "hover:bg-muted border border-transparent")}>
                            <Checkbox checked={selectedFolders.has(folder.folderName)} onCheckedChange={(checked) => {
                              const newSet = new Set(selectedFolders);
                              if (checked) newSet.add(folder.folderName); else newSet.delete(folder.folderName);
                              setSelectedFolders(newSet);
                            }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs shrink-0">{folder.managementNumber}</Badge>
                                <span className="text-sm font-medium">{folder.manager}</span>
                                <span className="text-sm text-muted-foreground">{folder.projectNumber}</span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setImportOpen(false)}>キャンセル</Button>
                  <Button onClick={handleImport} disabled={selectedFolders.size === 0 || importSubmitting}>
                    {importSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />取込中...</> : `${selectedFolders.size}件を取込`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* 編集ダイアログ */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>案件を編集</DialogTitle></DialogHeader>
              {editingProject && (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-managementNumber">管理番号</Label>
                    <Input id="edit-managementNumber" value={editingProject.managementNumber} onChange={(e) => setEditingProject({ ...editingProject, managementNumber: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-manager">担当</Label>
                    <Select value={editingProject.manager} onValueChange={(value) => setEditingProject({ ...editingProject, manager: value })}>
                      <SelectTrigger id="edit-manager" className="w-full"><SelectValue placeholder="選択してください" /></SelectTrigger>
                      <SelectContent>
                        {MANAGER_OPTIONS.map((name) => (<SelectItem key={name} value={name}>{name}</SelectItem>))}
                        {editingProject.manager && !MANAGER_OPTIONS.includes(editingProject.manager) && (<SelectItem value={editingProject.manager}>{editingProject.manager}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-client">販売先</Label>
                    <Input id="edit-client" value={editingProject.client} onChange={(e) => setEditingProject({ ...editingProject, client: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-projectNumber">案件番号</Label>
                    <Input id="edit-projectNumber" value={editingProject.projectNumber} onChange={(e) => setEditingProject({ ...editingProject, projectNumber: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>完成月</Label>
                    <Popover open={editCalendarOpen} onOpenChange={setEditCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editingProject.completionMonth ? formatCompletionMonth(editingProject.completionMonth) : "選択してください"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3">
                        <div className="flex items-center justify-between mb-3">
                          <Button type="button" variant="ghost" size="icon" onClick={() => setCalendarYear(calendarYear - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                          <span className="font-medium">{calendarYear}年</span>
                          <Button type="button" variant="ghost" size="icon" onClick={() => setCalendarYear(calendarYear + 1)}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {MONTHS.map((month, index) => (<Button key={month} type="button" variant="ghost" size="sm" className="h-9" onClick={() => selectEditMonth(index)}>{month}</Button>))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>キャンセル</Button>
                    <Button type="submit">保存</Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* 削除確認ダイアログ */}
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>案件を削除</AlertDialogTitle>
                <AlertDialogDescription>
                  「{deletingProject?.managementNumber}」を削除しますか？<br />関連する進捗もすべて削除されます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">削除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 編集モードヘルプ */}
          {isEditMode && (
            <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Pencil className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">編集モード:</span>
              <span className="text-muted-foreground">セルをクリックして編集 | Enter で保存 | Escape でキャンセル</span>
            </div>
          )}

          {/* ローディング表示 */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              読み込み中...
            </div>
          )}

          {/* テーブル */}
          <div className="relative">
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="flex">
                {/* 固定カラム部分 */}
                <div className="flex-shrink-0 border-r border-border bg-background z-10">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-12 bg-muted/30">
                        <TableHead className="px-2 bg-muted/30" style={{ minWidth: "120px" }}>
                          <div className="flex items-center gap-0.5">
                            <span className="text-xs font-semibold whitespace-nowrap">管理番号</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={toggleSort}>
                              {sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />}
                            </Button>
                          </div>
                        </TableHead>
                        <TableHead className="px-2 whitespace-nowrap text-xs font-semibold bg-muted/30" style={{ minWidth: "80px" }}>担当</TableHead>
                        <TableHead className="px-2 whitespace-nowrap text-xs font-semibold bg-muted/30" style={{ minWidth: "120px" }}>販売先</TableHead>
                        <TableHead className="px-2 whitespace-nowrap text-xs font-semibold bg-muted/30" style={{ minWidth: "140px" }}>販売店 案件番号</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.length === 0 ? (
                        <TableRow className="h-16">
                          <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">
                            {searchQuery ? "検索結果がありません" : "案件がありません"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        projects.map((project) => (
                          <TableRow
                            key={project.id}
                            className={cn("h-12", !isEditMode && "cursor-pointer hover:bg-muted/50")}
                            onClick={() => { if (!isEditMode) router.push(`/projects/${project.id}`); }}
                          >
                            <TableCell className="font-medium text-sm py-2 px-2 bg-background">
                              {renderEditableCell(project, "managementNumber", "flex items-center gap-1")}
                            </TableCell>
                            <TableCell className="text-sm py-2 px-2 bg-background">
                              {renderEditableCell(project, "manager")}
                            </TableCell>
                            <TableCell className="text-sm py-2 px-2 bg-background">
                              {renderEditableCell(project, "client")}
                            </TableCell>
                            <TableCell className="text-sm py-2 px-2 bg-background">
                              {renderEditableCell(project, "projectNumber")}
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
                          {TABLE_COLUMNS.slice(FIXED_COLUMNS_COUNT).map((col) => (
                            <TableHead key={col.key} className="px-2 whitespace-nowrap text-xs font-semibold bg-muted/30" style={{ minWidth: col.width }}>
                              {col.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projects.length === 0 ? (
                          <TableRow className="h-16">
                            <TableCell colSpan={TABLE_COLUMNS.length - FIXED_COLUMNS_COUNT} className="text-center text-muted-foreground text-sm py-8">&nbsp;</TableCell>
                          </TableRow>
                        ) : (
                          projects.map((project) => (
                            <TableRow key={project.id} className="h-12 hover:bg-muted/50">
                              {TABLE_COLUMNS.slice(FIXED_COLUMNS_COUNT).map((col) => (
                                <TableCell key={col.key} className="text-sm py-2 px-2 whitespace-nowrap">
                                  {renderEditableCell(project, col.key)}
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

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {pagination.totalCount}件中 {(pagination.page - 1) * pagination.limit + 1}〜{Math.min(pagination.page * pagination.limit, pagination.totalCount)}件
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={pagination.page <= 1 || isLoading} onClick={() => goToPage(1)}>
                  最初
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page <= 1 || isLoading} onClick={() => goToPage(pagination.page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {/* ページ番号ボタン */}
                {(() => {
                  const pages: number[] = [];
                  const start = Math.max(1, pagination.page - 2);
                  const end = Math.min(pagination.totalPages, pagination.page + 2);
                  for (let i = start; i <= end; i++) pages.push(i);
                  return pages.map((p) => (
                    <Button
                      key={p}
                      variant={p === pagination.page ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={isLoading}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </Button>
                  ));
                })()}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagination.page >= pagination.totalPages || isLoading} onClick={() => goToPage(pagination.page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages || isLoading} onClick={() => goToPage(pagination.totalPages)}>
                  最後
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
