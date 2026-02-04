"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  GitBranch,
  Search,
  ChevronRight,
  Calendar as CalendarIcon,
  Check,
  Clock,
  Pencil,
  Filter,
  X,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Project, Progress } from "@/db/schema";

// フェーズ定義
const PHASES = [
  { key: "agreement", title: "合意書", order: 1 },
  { key: "submission", title: "案件提出", order: 2 },
  { key: "survey", title: "現調", order: 3 },
  { key: "land_sale_contract", title: "土地売買契約", order: 4 },
  { key: "land_contract", title: "土地契約", order: 5 },
  { key: "legal_application", title: "法令申請", order: 6 },
  { key: "legal_approval", title: "法令許可", order: 7 },
  { key: "power_application", title: "電力申請", order: 8 },
  { key: "power_response", title: "電力回答", order: 9 },
  { key: "ss_request", title: "SS依頼", order: 10 },
  { key: "ss_execution", title: "SS実施", order: 11 },
  { key: "land_settlement", title: "土地決済", order: 12 },
  { key: "order", title: "発注", order: 13 },
  { key: "construction_start", title: "着工", order: 14 },
  { key: "grid_connection", title: "連系", order: 15 },
  { key: "completion", title: "完工", order: 16 },
] as const;

type PhaseKey = (typeof PHASES)[number]["key"];

interface ProjectWithProgress extends Project {
  progressItems: Progress[];
}

interface TimelineViewProps {
  projects: ProjectWithProgress[];
}

function formatDateShort(date: Date | null): string {
  if (!date) return "-";
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

function formatDateFull(date: Date | null): string {
  if (!date) return "-";
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}

export default function TimelineView({ projects: initialProjects }: TimelineViewProps) {
  const [projects, setProjects] = useState<ProjectWithProgress[]>(initialProjects);
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithProgress | null>(null);
  const [editingPhase, setEditingPhase] = useState<(typeof PHASES)[number] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // フィルター機能用のstate
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
  const toggleProjectSelection = (projectId: number) => {
    setSelectedProjectIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // 全選択/全解除
  const selectAll = () => {
    setSelectedProjectIds(new Set(filterableProjects.map((p) => p.id)));
  };

  const clearAll = () => {
    setSelectedProjectIds(new Set());
  };

  // フィルターをクリア
  const clearFilter = () => {
    setSelectedProjectIds(new Set());
    setFilterSearchQuery("");
  };

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

  // プロジェクトのフェーズ状況を取得
  const getPhaseStatus = (project: ProjectWithProgress, phaseTitle: string) => {
    const progressItem = project.progressItems.find((p) => p.title === phaseTitle);
    if (!progressItem) return { status: "pending", date: null };

    if (progressItem.status === "completed" && progressItem.completedAt) {
      return { status: "completed", date: new Date(progressItem.completedAt) };
    }
    if (progressItem.createdAt) {
      return { status: "planned", date: new Date(progressItem.createdAt) };
    }
    return { status: "pending", date: null };
  };

  // 現在のフェーズを特定
  const getCurrentPhaseIndex = (project: ProjectWithProgress): number => {
    for (let i = PHASES.length - 1; i >= 0; i--) {
      const status = getPhaseStatus(project, PHASES[i].title);
      if (status.status === "completed") {
        return i + 1; // 完了したフェーズの次
      }
    }
    return 0;
  };

  const openEditDialog = (project: ProjectWithProgress, phase: (typeof PHASES)[number]) => {
    setEditingProject(project);
    setEditingPhase(phase);
    const status = getPhaseStatus(project, phase.title);
    setSelectedDate(status.date || undefined);
    setEditDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!editingProject || !editingPhase || !selectedDate) {
      setEditDialogOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      // 既存のProgressアイテムを検索
      const existingProgress = editingProject.progressItems.find(
        (p) => p.title === editingPhase.title
      );

      const dateStr = selectedDate.toISOString();

      if (existingProgress) {
        // 既存のProgressを更新
        await fetch(`/api/projects/${editingProject.id}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            progressId: existingProgress.id,
            status: "completed",
            completedAt: dateStr,
          }),
        });
      } else {
        // 新規Progressを作成
        await fetch(`/api/projects/${editingProject.id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editingPhase.title,
            status: "completed",
            createdAt: dateStr,
          }),
        });
      }

      // ローカル状態を更新
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== editingProject.id) return p;
          const updatedProgressItems = existingProgress
            ? p.progressItems.map((item) =>
                item.id === existingProgress.id
                  ? { ...item, status: "completed" as const, completedAt: dateStr }
                  : item
              )
            : [
                ...p.progressItems,
                {
                  id: Date.now(), // 仮のID（サーバーからの応答で更新されるまで）
                  projectId: p.id,
                  title: editingPhase.title,
                  description: null,
                  status: "completed" as const,
                  createdAt: dateStr,
                  completedAt: dateStr,
                },
              ];
          return { ...p, progressItems: updatedProgressItems };
        })
      );

      setEditDialogOpen(false);
    } catch (error) {
      console.error("保存に失敗しました:", error);
      alert("保存に失敗しました。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  }, [editingProject, editingPhase, selectedDate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold">タイムライン</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              複数案件のフェーズ進捗を比較・管理できます
            </p>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="管理番号・クライアントで検索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>完了</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>進行中</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
              <span>予定</span>
            </div>
          </div>

          {/* Filter indicator */}
          {isFiltered && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="gap-1">
                <Filter className="h-3 w-3" />
                {selectedProjectIds.size}件を表示中
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilter}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                フィルターを解除
              </Button>
            </div>
          )}

          {/* Timeline Table */}
          <Card>
            <CardContent className="p-0">
              <div className="w-full overflow-hidden">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b">
                      <th className="sticky left-0 bg-card z-10 px-2 py-3 text-left font-medium text-muted-foreground w-[140px]">
                        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              className={cn(
                                "h-auto p-2 font-semibold text-muted-foreground hover:text-foreground justify-start gap-2 text-sm",
                                isFiltered && "text-primary"
                              )}
                            >
                              <Filter className={cn("h-4 w-4", isFiltered && "text-primary")} />
                              案件
                              <ChevronDown className="h-3 w-3" />
                              {isFiltered && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                  {selectedProjectIds.size}
                                </Badge>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
                            <div className="p-3 border-b">
                              <div className="flex items-center gap-2 mb-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="案件を検索..."
                                  value={filterSearchQuery}
                                  onChange={(e) => setFilterSearchQuery(e.target.value)}
                                  className="h-8"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={selectAll}
                                  className="h-7 text-xs flex-1"
                                >
                                  全選択
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={clearAll}
                                  className="h-7 text-xs flex-1"
                                >
                                  全解除
                                </Button>
                              </div>
                            </div>
                            <ScrollArea className="h-[300px]">
                              <div className="p-2">
                                {filterableProjects.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    案件が見つかりません
                                  </p>
                                ) : (
                                  filterableProjects.map((project) => (
                                    <div
                                      key={project.id}
                                      className="flex items-center gap-3 px-2 py-2 rounded hover:bg-muted/50 cursor-pointer"
                                      onClick={() => toggleProjectSelection(project.id)}
                                    >
                                      <Checkbox
                                        checked={selectedProjectIds.has(project.id)}
                                        onCheckedChange={() => toggleProjectSelection(project.id)}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                          {project.managementNumber}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {project.client}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </ScrollArea>
                            <div className="p-2 border-t">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => setFilterOpen(false)}
                                className="w-full h-8"
                              >
                                適用 ({selectedProjectIds.size}件選択中)
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </th>
                      {PHASES.map((phase) => (
                        <th
                          key={phase.key}
                          className="px-0 py-3 text-center font-semibold text-muted-foreground text-xs"
                          title={phase.title}
                        >
                          <span className="block truncate leading-tight">{phase.title}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.length === 0 ? (
                      <tr>
                        <td
                          colSpan={PHASES.length + 1}
                          className="px-4 py-8 text-center text-muted-foreground text-base"
                        >
                          案件が見つかりません
                        </td>
                      </tr>
                    ) : (
                      filteredProjects.map((project) => {
                        const currentPhaseIndex = getCurrentPhaseIndex(project);
                        return (
                          <tr
                            key={project.id}
                            className="border-b hover:bg-muted/30 transition-colors"
                          >
                            <td className="sticky left-0 bg-card z-10 px-2 py-3 w-[140px]">
                              <Link
                                href={`/projects/${project.id}`}
                                className="group flex items-center gap-1"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold group-hover:underline truncate">
                                    {project.managementNumber}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {project.client}
                                  </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </Link>
                            </td>
                            {PHASES.map((phase, index) => {
                              const phaseStatus = getPhaseStatus(project, phase.title);
                              const isCompleted = phaseStatus.status === "completed";
                              const isCurrent = index === currentPhaseIndex;

                              return (
                                <td
                                  key={phase.key}
                                  className="px-0 py-2 text-center"
                                >
                                  <button
                                    onClick={() => openEditDialog(project, phase)}
                                    className={cn(
                                      "group relative w-full flex flex-col items-center gap-1 p-1 rounded hover:bg-muted/50 transition-colors",
                                    )}
                                  >
                                    {/* Progress indicator */}
                                    <div
                                      className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                                        isCompleted && "bg-green-500 text-white",
                                        isCurrent && !isCompleted && "bg-blue-500 text-white",
                                        !isCompleted && !isCurrent && "bg-zinc-200 dark:bg-zinc-700"
                                      )}
                                    >
                                      {isCompleted ? (
                                        <Check className="h-4 w-4" />
                                      ) : isCurrent ? (
                                        <Clock className="h-4 w-4" />
                                      ) : (
                                        <span className="text-xs text-muted-foreground font-bold">
                                          {index + 1}
                                        </span>
                                      )}
                                    </div>
                                    {/* Date */}
                                    <span
                                      className={cn(
                                        "text-xs font-semibold truncate w-full",
                                        isCompleted
                                          ? "text-green-600 dark:text-green-400"
                                          : "text-muted-foreground"
                                      )}
                                    >
                                      {phaseStatus.date ? formatDateShort(phaseStatus.date) : "-"}
                                    </span>
                                    {/* Edit icon on hover */}
                                    <Pencil className="absolute top-0 right-0 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Progress Bar View (Alternative) */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">進捗バー表示</h2>
            {filteredProjects.slice(0, 5).map((project) => {
              const currentPhaseIndex = getCurrentPhaseIndex(project);
              const progressPercent = Math.round((currentPhaseIndex / PHASES.length) * 100);

              return (
                <Card key={project.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium hover:underline"
                      >
                        {project.managementNumber}
                      </Link>
                      <Badge variant="outline" className="text-xs">
                        {progressPercent}%
                      </Badge>
                    </div>
                    <div className="relative">
                      {/* Progress bar background */}
                      <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      {/* Phase markers */}
                      <div className="flex justify-between mt-1">
                        {PHASES.filter((_, i) => i % 4 === 0 || i === PHASES.length - 1).map(
                          (phase, i) => (
                            <span
                              key={phase.key}
                              className="text-[10px] text-muted-foreground"
                            >
                              {phase.title}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      現在のフェーズ:{" "}
                      <span className="font-medium text-foreground">
                        {currentPhaseIndex < PHASES.length
                          ? PHASES[currentPhaseIndex].title
                          : "完了"}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>フェーズ日付を編集</DialogTitle>
          </DialogHeader>
          {editingProject && editingPhase && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">案件</p>
                <p className="font-medium">{editingProject.managementNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">フェーズ</p>
                <p className="font-medium">{editingPhase.title}</p>
              </div>
              <div className="space-y-2">
                <Label>完了日 / 予定日</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? formatDateFull(selectedDate) : "日付を選択"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSaving}>
                  キャンセル
                </Button>
                <Button onClick={handleSave} disabled={isSaving || !selectedDate}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      保存中...
                    </>
                  ) : (
                    "保存"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
