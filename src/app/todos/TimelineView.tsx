"use client";

import { useState, useMemo, useCallback } from "react";
import {
  GitBranch,
  Search,
  Check,
  Filter,
  X,
  Flame,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { format as formatDate } from "date-fns";
import { PHASES } from "./_constants";
import type { Progress } from "@/db/schema";
import type { ProjectWithProgress, TimelineViewProps } from "./_types";
import { ProjectRow, FilterPanel, ProjectFormDialog } from "./_components";

// フェーズ状況をサブフェーズから集約して取得
// phase.title（親フェーズ名）と phase.subTitles（子タスク名）の両方でマッチ
function getPhaseStatus(project: ProjectWithProgress, phase: (typeof PHASES)[number]) {
  const subTitles = phase.subTitles;
  let completedCount = 0;
  let latestDate: Date | null = null;
  let hasAnyProgress = false;

  for (const subTitle of subTitles) {
    const item = project.progressItems.find((p) => p.title === subTitle);
    if (!item) continue;
    hasAnyProgress = true;

    if (item.status === "completed" && item.completedAt) {
      completedCount++;
      const d = new Date(item.completedAt);
      if (!latestDate || d > latestDate) latestDate = d;
    } else if (item.createdAt) {
      const d = new Date(item.createdAt);
      if (!latestDate || d > latestDate) latestDate = d;
    }
  }

  // subTitles でマッチしなかった場合、phase.title でもフォールバック検索
  if (!hasAnyProgress) {
    const phaseItem = project.progressItems.find((p) => p.title === phase.title);
    if (phaseItem) {
      hasAnyProgress = true;
      if (phaseItem.status === "completed" && phaseItem.completedAt) {
        completedCount = subTitles.length;
        latestDate = new Date(phaseItem.completedAt);
      } else if (phaseItem.createdAt) {
        latestDate = new Date(phaseItem.createdAt);
      }
    }
  }

  if (completedCount === subTitles.length && subTitles.length > 0) {
    return { status: "completed" as const, date: latestDate };
  }
  if (hasAnyProgress) {
    return { status: "planned" as const, date: latestDate };
  }
  return { status: "pending" as const, date: null };
}

// 赤アラートかどうか
function isPhaseAlert(project: ProjectWithProgress, phaseIndex: number, today: Date): boolean {
  const phase = PHASES[phaseIndex];
  const phaseStatus = getPhaseStatus(project, phase);

  if (phaseStatus.status === "completed") return false;
  if (!phaseStatus.date) return true;

  const dueDate = new Date(phaseStatus.date);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

export default function TimelineView({ projects: initialProjects }: TimelineViewProps) {
  const [projects, setProjects] = useState<ProjectWithProgress[]>(initialProjects);
  const [searchQuery, setSearchQuery] = useState("");

  // 編集用state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithProgress | null>(null);
  const [editingPhase, setEditingPhase] = useState<(typeof PHASES)[number] | null>(null);
  const [plannedDate, setPlannedDate] = useState<Date | undefined>(undefined);
  const [completedDate, setCompletedDate] = useState<Date | undefined>(undefined);
  const [phaseMemo, setPhaseMemo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 案件登録用state
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  // アラートダイアログ用state
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertDialogTitle, setAlertDialogTitle] = useState("");
  const [alertDialogMessage, setAlertDialogMessage] = useState("");

  // フィルター機能用state
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(new Set());
  const [filterSearchQuery, setFilterSearchQuery] = useState("");

  // 今日の日付（時刻を除去）
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // フィルタリングされた案件リスト
  const filteredProjects = useMemo(() => {
    let result = projects;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.managementNumber.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q)
      );
    }

    if (selectedProjectIds.size > 0) {
      result = result.filter((p) => selectedProjectIds.has(p.id));
    }

    return result;
  }, [projects, searchQuery, selectedProjectIds]);

  const isFiltered = selectedProjectIds.size > 0;

  // アラート数を計算
  const alertCount = useMemo(() => {
    let count = 0;
    for (const project of filteredProjects) {
      for (let i = 0; i < PHASES.length; i++) {
        if (isPhaseAlert(project, i, today)) {
          count++;
        }
      }
    }
    return count;
  }, [filteredProjects, today]);

  // アラート表示ヘルパー
  const showAlert = useCallback((title: string, message: string) => {
    setAlertDialogTitle(title);
    setAlertDialogMessage(message);
    setAlertDialogOpen(true);
  }, []);

  // phase.title または subTitles で既存の進捗を検索するヘルパー
  const findExistingProgress = useCallback(
    (project: ProjectWithProgress, phase: (typeof PHASES)[number]) => {
      let item = project.progressItems.find((p) => p.title === phase.title);
      if (!item) {
        for (const subTitle of phase.subTitles) {
          const found = project.progressItems.find((p) => p.title === subTitle);
          if (found) {
            if (!item || (found.createdAt && (!item.createdAt || found.createdAt > item.createdAt))) {
              item = found;
            }
          }
        }
      }
      return item || null;
    },
    []
  );

  // 編集ダイアログを開く
  const openEditDialog = useCallback(
    (project: ProjectWithProgress, phase: (typeof PHASES)[number]) => {
      setEditingProject(project);
      setEditingPhase(phase);
      const progressItem = findExistingProgress(project, phase);
      setPlannedDate(progressItem?.createdAt ? new Date(progressItem.createdAt) : undefined);
      setCompletedDate(progressItem?.completedAt ? new Date(progressItem.completedAt) : undefined);
      setPhaseMemo(progressItem?.description || "");
      setEditDialogOpen(true);
    },
    [findExistingProgress]
  );

  // 保存処理
  const handleSave = useCallback(async () => {
    if (!editingProject || !editingPhase) {
      setEditDialogOpen(false);
      return;
    }

    if (!plannedDate && !completedDate) {
      setEditDialogOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      const existingProgress = findExistingProgress(editingProject, editingPhase);

      const plannedDateStr = plannedDate ? plannedDate.toISOString() : null;
      const completedDateStr = completedDate ? completedDate.toISOString() : null;
      const newStatus = completedDate ? "completed" : "planned";

      let savedProgress: Progress | null = null;

      if (existingProgress) {
        const res = await fetch(`/api/projects/${editingProject.id}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            progressId: existingProgress.id,
            status: newStatus,
            createdAt: plannedDateStr,
            completedAt: completedDateStr,
            description: phaseMemo || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to update progress");
        savedProgress = await res.json();
      } else {
        const res = await fetch(`/api/projects/${editingProject.id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editingPhase.title,
            status: newStatus,
            createdAt: plannedDateStr || new Date().toISOString(),
            completedAt: completedDateStr,
            description: phaseMemo || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to create progress");
        savedProgress = await res.json();
      }

      // ローカル状態を更新（APIレスポンスの実IDを使用）
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== editingProject.id) return p;
          const updatedProgressItems = existingProgress
            ? p.progressItems.map((item) =>
                item.id === existingProgress.id
                  ? (savedProgress ?? item)
                  : item
              )
            : [...p.progressItems, ...(savedProgress ? [savedProgress] : [])];
          return { ...p, progressItems: updatedProgressItems };
        })
      );

      setEditDialogOpen(false);
    } catch (error) {
      console.error("保存に失敗しました:", error);
      showAlert("エラー", "保存に失敗しました。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  }, [editingProject, editingPhase, plannedDate, completedDate, phaseMemo, showAlert, findExistingProgress]);

  // 完了処理
  const handleMarkComplete = useCallback(async () => {
    if (!editingProject || !editingPhase) return;

    const now = new Date();
    setCompletedDate(now);

    setIsSaving(true);
    try {
      const existingProgress = findExistingProgress(editingProject, editingPhase);

      const plannedDateStr = plannedDate ? plannedDate.toISOString() : new Date().toISOString();
      const completedDateStr = now.toISOString();

      let savedProgress: Progress | null = null;

      if (existingProgress) {
        const res = await fetch(`/api/projects/${editingProject.id}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            progressId: existingProgress.id,
            status: "completed",
            createdAt: plannedDateStr,
            completedAt: completedDateStr,
            description: phaseMemo || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to mark as complete");
        savedProgress = await res.json();
      } else {
        const res = await fetch(`/api/projects/${editingProject.id}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editingPhase.title,
            status: "completed",
            createdAt: plannedDateStr,
            completedAt: completedDateStr,
            description: phaseMemo || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to create completed progress");
        savedProgress = await res.json();
      }

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== editingProject.id) return p;
          const updatedProgressItems = existingProgress
            ? p.progressItems.map((item) =>
                item.id === existingProgress.id
                  ? (savedProgress ?? item)
                  : item
              )
            : [...p.progressItems, ...(savedProgress ? [savedProgress] : [])];
          return { ...p, progressItems: updatedProgressItems };
        })
      );

      setEditDialogOpen(false);
    } catch (error) {
      console.error("完了処理に失敗しました:", error);
      showAlert("エラー", "完了処理に失敗しました。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  }, [editingProject, editingPhase, plannedDate, phaseMemo, showAlert, findExistingProgress]);

  // 未完了に戻す処理
  const handleMarkIncomplete = useCallback(async () => {
    if (!editingProject || !editingPhase) return;

    setCompletedDate(undefined);

    setIsSaving(true);
    try {
      const existingProgress = findExistingProgress(editingProject, editingPhase);

      if (!existingProgress) {
        setIsSaving(false);
        return;
      }

      const plannedDateStr = plannedDate ? plannedDate.toISOString() : existingProgress.createdAt;

      const res = await fetch(`/api/projects/${editingProject.id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressId: existingProgress.id,
          status: "planned",
          createdAt: plannedDateStr,
          completedAt: null,
          description: phaseMemo || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to mark as incomplete");
      const savedProgress: Progress = await res.json();

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== editingProject.id) return p;
          const updatedProgressItems = p.progressItems.map((item) =>
            item.id === existingProgress.id ? savedProgress : item
          );
          return { ...p, progressItems: updatedProgressItems };
        })
      );

      setEditDialogOpen(false);
    } catch (error) {
      console.error("未完了処理に失敗しました:", error);
      showAlert("エラー", "未完了処理に失敗しました。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  }, [editingProject, editingPhase, plannedDate, phaseMemo, showAlert, findExistingProgress]);

  // TODO追加処理
  const handleAddTodo = useCallback(async () => {
    if (!editingProject || !editingPhase || !plannedDate) {
      showAlert("入力エラー", "予定日を設定してください");
      return;
    }

    setIsSaving(true);
    try {
      const dueDateStr = `${plannedDate.getFullYear()}-${String(plannedDate.getMonth() + 1).padStart(2, "0")}-${String(plannedDate.getDate()).padStart(2, "0")}`;
      const content = `【${editingPhase.title}】${phaseMemo || editingPhase.title}`;

      const res = await fetch(`/api/projects/${editingProject.id}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          dueDate: dueDateStr,
        }),
      });
      if (!res.ok) throw new Error("Failed to add TODO");

      showAlert("完了", "TODOに追加しました");
    } catch (error) {
      console.error("TODO追加に失敗しました:", error);
      showAlert("エラー", "TODO追加に失敗しました。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  }, [editingProject, editingPhase, plannedDate, phaseMemo, showAlert]);

  // 案件登録処理
  const handleProjectSubmit = useCallback(
    async (projectForm: { managementNumber: string; manager: string; client: string; projectNumber: string; completionMonth?: string | null }) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectForm),
      });
      if (res.ok) {
        const newProject = await res.json();
        setProjects((prev) => [...prev, { ...newProject, progressItems: [] }]);
      } else {
        throw new Error("Failed to create project");
      }
    },
    []
  );

  // フィルター操作
  const toggleProjectSelection = useCallback((projectId: number) => {
    setSelectedProjectIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    const filterableProjects = filterSearchQuery.trim()
      ? projects.filter(
          (p) =>
            p.managementNumber.toLowerCase().includes(filterSearchQuery.toLowerCase()) ||
            p.client.toLowerCase().includes(filterSearchQuery.toLowerCase())
        )
      : projects;
    setSelectedProjectIds(new Set(filterableProjects.map((p) => p.id)));
  }, [projects, filterSearchQuery]);

  const clearAll = useCallback(() => {
    setSelectedProjectIds(new Set());
  }, []);

  const clearFilter = useCallback(() => {
    setSelectedProjectIds(new Set());
    setFilterSearchQuery("");
  }, []);

  // 日付フォーマット
  const formatDateFull = (date: Date | null): string => {
    if (!date) return "-";
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${y}.${m}.${d}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-lg sm:text-xl font-semibold">タイムライン</h1>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {alertCount > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-red-500/10 border border-red-500/30">
                    <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                    <span className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">
                      {alertCount}件
                    </span>
                  </div>
                )}
                <Button size="sm" onClick={() => setProjectDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">新規登録</span>
                </Button>
              </div>
            </div>

            {/* テーマメッセージ */}
            <div
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border",
                alertCount > 0
                  ? "bg-red-500/5 border-red-500/30"
                  : "bg-green-500/5 border-green-500/30"
              )}
            >
              {alertCount > 0 ? (
                <>
                  <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
                  <div>
                    <p className="font-bold text-red-600 dark:text-red-400">
                      真っ赤をなくす作業
                    </p>
                    <p className="text-sm text-muted-foreground">
                      期日超過・期日未設定のフェーズを解消してください
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Check className="h-6 w-6 text-green-500 shrink-0" />
                  <div>
                    <p className="font-bold text-green-600 dark:text-green-400">
                      すべてのフェーズが正常です
                    </p>
                    <p className="text-sm text-muted-foreground">
                      期日超過・期日未設定のフェーズはありません
                    </p>
                  </div>
                </>
              )}
            </div>

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
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="font-medium text-red-600 dark:text-red-400">期日超過・未設定</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="font-medium text-yellow-600 dark:text-yellow-400">1週間以内</span>
            </div>
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
                        <FilterPanel
                          open={filterOpen}
                          onOpenChange={setFilterOpen}
                          projects={projects}
                          selectedProjectIds={selectedProjectIds}
                          filterSearchQuery={filterSearchQuery}
                          onFilterSearchChange={setFilterSearchQuery}
                          onToggleProject={toggleProjectSelection}
                          onSelectAll={selectAll}
                          onClearAll={clearAll}
                        />
                      </th>
                      {PHASES.map((phase) => (
                        <th
                          key={phase.key}
                          className="px-0 py-2 text-center text-muted-foreground"
                          title={phase.subTitles.join("、")}
                        >
                          <span className="block text-xs font-semibold leading-tight">{phase.title}</span>
                          <span className="block text-[10px] font-normal leading-tight mt-0.5 opacity-70">{phase.subtitle}</span>
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
                      filteredProjects.map((project) => (
                        <ProjectRow
                          key={project.id}
                          project={project}
                          today={today}
                          onOpenEditDialog={openEditDialog}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog - インライン実装（状態共有のため） */}
      {editDialogOpen && editingProject && editingPhase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setEditDialogOpen(false)}
          />
          <div className="relative z-50 w-full max-w-lg mx-4 bg-background rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4">フェーズを編集</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">案件</p>
                  <p className="font-medium">{editingProject.managementNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">フェーズ</p>
                  <p className="font-medium">{editingPhase.title}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">予定日</label>
                <DatePicker
                  value={plannedDate ? formatDate(plannedDate, "yyyy-MM-dd") : null}
                  onChange={(val) => setPlannedDate(val ? new Date(val + "T00:00:00") : undefined)}
                  placeholder="予定日を選択"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">完了日</label>
                <DatePicker
                  value={completedDate ? formatDate(completedDate, "yyyy-MM-dd") : null}
                  onChange={(val) => setCompletedDate(val ? new Date(val + "T00:00:00") : undefined)}
                  placeholder="完了日を選択"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">メモ</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  value={phaseMemo}
                  onChange={(e) => setPhaseMemo(e.target.value)}
                  placeholder="メモを入力..."
                  rows={3}
                />
              </div>
              <div className="flex justify-between pt-4">
                <div className="flex gap-2">
                  {completedDate ? (
                    <Button
                      variant="outline"
                      className="border-orange-500 text-orange-600"
                      onClick={handleMarkIncomplete}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      未完了に戻す
                    </Button>
                  ) : (
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleMarkComplete}
                      disabled={isSaving}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      完了にする
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="border-blue-500 text-blue-600"
                    onClick={handleAddTodo}
                    disabled={isSaving}
                  >
                    TODOに追加
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    disabled={isSaving}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || (!plannedDate && !completedDate)}
                  >
                    {isSaving ? "保存中..." : "保存"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 案件登録ダイアログ */}
      <ProjectFormDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSubmit={handleProjectSubmit}
        showAlert={showAlert}
      />

      {/* アラートダイアログ */}
      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{alertDialogMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialogOpen(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
