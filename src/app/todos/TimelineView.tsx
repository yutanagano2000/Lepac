"use client";

import { useState, useMemo, useCallback, memo } from "react";
import Link from "next/link";
import {
  GitBranch,
  Search,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Check,
  Clock,
  Pencil,
  Filter,
  X,
  ChevronDown,
  Loader2,
  AlertTriangle,
  Flame,
  Plus,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Project, Progress, NewProject } from "@/db/schema";

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const MANAGER_OPTIONS = ["吉國", "刎本", "松下", "佐東", "川田", "近永", "その他"];

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
  const [plannedDate, setPlannedDate] = useState<Date | undefined>(undefined);
  const [completedDate, setCompletedDate] = useState<Date | undefined>(undefined);
  const [phaseMemo, setPhaseMemo] = useState("");
  const [plannedCalendarOpen, setPlannedCalendarOpen] = useState(false);
  const [completedCalendarOpen, setCompletedCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 案件登録用のstate
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectForm, setProjectForm] = useState<NewProject>({
    managementNumber: "",
    manager: "",
    client: "",
    projectNumber: "",
    completionMonth: "",
  });
  const [projectCalendarOpen, setProjectCalendarOpen] = useState(false);
  const [projectCalendarYear, setProjectCalendarYear] = useState(new Date().getFullYear());
  const [isProjectSubmitting, setIsProjectSubmitting] = useState(false);

  // アラートダイアログ用のstate
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertDialogTitle, setAlertDialogTitle] = useState("");
  const [alertDialogMessage, setAlertDialogMessage] = useState("");

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

  // 今日の日付（時刻を除去）
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

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

  // アラート種別判定: 未完了フェーズのアラートレベルを返す
  // "critical" = 赤（期日超過・期日未設定）, "warning" = 黄（1週間以内）, null = アラートなし
  type AlertLevel = "critical" | "warning" | null;

  const getPhaseAlertLevel = (project: ProjectWithProgress, phaseIndex: number): AlertLevel => {
    const phase = PHASES[phaseIndex];
    const phaseStatus = getPhaseStatus(project, phase.title);

    // 完了済みはアラートなし
    if (phaseStatus.status === "completed") return null;

    // 期日未設定は赤色アラート
    if (!phaseStatus.date) return "critical";

    // 期日との比較
    const dueDate = new Date(phaseStatus.date);
    dueDate.setHours(0, 0, 0, 0);

    // 期日超過は赤色アラート
    if (dueDate < today) return "critical";

    // 1週間以内は黄色アラート
    const oneWeekLater = new Date(today);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    if (dueDate <= oneWeekLater) return "warning";

    return null;
  };

  // 後方互換のためのヘルパー（赤アラートかどうか）
  const isPhaseAlert = (project: ProjectWithProgress, phaseIndex: number): boolean => {
    return getPhaseAlertLevel(project, phaseIndex) === "critical";
  };

  // アラート数を計算（表示中の案件のすべてのアラートフェーズをカウント）
  const alertCount = useMemo(() => {
    let count = 0;
    for (const project of filteredProjects) {
      for (let i = 0; i < PHASES.length; i++) {
        if (isPhaseAlert(project, i)) {
          count++;
        }
      }
    }
    return count;
  }, [filteredProjects, today]);

  const openEditDialog = (project: ProjectWithProgress, phase: (typeof PHASES)[number]) => {
    setEditingProject(project);
    setEditingPhase(phase);
    const progressItem = project.progressItems.find((p) => p.title === phase.title);
    // 予定日（createdAt）と完了日（completedAt）を個別に設定
    setPlannedDate(progressItem?.createdAt ? new Date(progressItem.createdAt) : undefined);
    setCompletedDate(progressItem?.completedAt ? new Date(progressItem.completedAt) : undefined);
    setPhaseMemo(progressItem?.description || "");
    setEditDialogOpen(true);
  };

  // アラートダイアログを表示するヘルパー
  const showAlert = useCallback((title: string, message: string) => {
    setAlertDialogTitle(title);
    setAlertDialogMessage(message);
    setAlertDialogOpen(true);
  }, []);

  // 保存処理（予定日・完了日・メモを保存）
  const handleSave = useCallback(async () => {
    if (!editingProject || !editingPhase) {
      setEditDialogOpen(false);
      return;
    }

    // 予定日も完了日も未設定の場合は保存しない
    if (!plannedDate && !completedDate) {
      setEditDialogOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      const existingProgress = editingProject.progressItems.find(
        (p) => p.title === editingPhase.title
      );

      const plannedDateStr = plannedDate ? plannedDate.toISOString() : null;
      const completedDateStr = completedDate ? completedDate.toISOString() : null;
      const newStatus = completedDate ? "completed" : "planned";

      if (existingProgress) {
        await fetch(`/api/projects/${editingProject.id}/progress`, {
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
      } else {
        await fetch(`/api/projects/${editingProject.id}/progress`, {
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
      }

      // ローカル状態を更新
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== editingProject.id) return p;
          const updatedProgressItems = existingProgress
            ? p.progressItems.map((item) =>
                item.id === existingProgress.id
                  ? {
                      ...item,
                      status: newStatus as "planned" | "completed",
                      createdAt: plannedDateStr || item.createdAt,
                      completedAt: completedDateStr,
                      description: phaseMemo || null,
                    }
                  : item
              )
            : [
                ...p.progressItems,
                {
                  id: Date.now(),
                  projectId: p.id,
                  title: editingPhase.title,
                  description: phaseMemo || null,
                  status: newStatus as "planned" | "completed",
                  createdAt: plannedDateStr || new Date().toISOString(),
                  completedAt: completedDateStr,
                },
              ];
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
  }, [editingProject, editingPhase, plannedDate, completedDate, phaseMemo, showAlert]);

  // 完了ボタン処理（完了日を今日に設定して保存）
  const handleMarkComplete = useCallback(async () => {
    if (!editingProject || !editingPhase) return;

    const now = new Date();
    setCompletedDate(now);

    setIsSaving(true);
    try {
      const existingProgress = editingProject.progressItems.find(
        (p) => p.title === editingPhase.title
      );

      const plannedDateStr = plannedDate ? plannedDate.toISOString() : new Date().toISOString();
      const completedDateStr = now.toISOString();

      if (existingProgress) {
        await fetch(`/api/projects/${editingProject.id}/progress`, {
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
      } else {
        await fetch(`/api/projects/${editingProject.id}/progress`, {
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
      }

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== editingProject.id) return p;
          const updatedProgressItems = existingProgress
            ? p.progressItems.map((item) =>
                item.id === existingProgress.id
                  ? {
                      ...item,
                      status: "completed" as const,
                      createdAt: plannedDateStr,
                      completedAt: completedDateStr,
                      description: phaseMemo || null,
                    }
                  : item
              )
            : [
                ...p.progressItems,
                {
                  id: Date.now(),
                  projectId: p.id,
                  title: editingPhase.title,
                  description: phaseMemo || null,
                  status: "completed" as const,
                  createdAt: plannedDateStr,
                  completedAt: completedDateStr,
                },
              ];
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
  }, [editingProject, editingPhase, plannedDate, phaseMemo, showAlert]);

  // 未完了に戻す処理
  const handleMarkIncomplete = useCallback(async () => {
    if (!editingProject || !editingPhase) return;

    setCompletedDate(undefined);

    setIsSaving(true);
    try {
      const existingProgress = editingProject.progressItems.find(
        (p) => p.title === editingPhase.title
      );

      if (!existingProgress) {
        setIsSaving(false);
        return;
      }

      const plannedDateStr = plannedDate ? plannedDate.toISOString() : existingProgress.createdAt;

      await fetch(`/api/projects/${editingProject.id}/progress`, {
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

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== editingProject.id) return p;
          const updatedProgressItems = p.progressItems.map((item) =>
            item.id === existingProgress.id
              ? {
                  ...item,
                  status: "planned" as const,
                  createdAt: plannedDateStr,
                  completedAt: null,
                  description: phaseMemo || null,
                }
              : item
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
  }, [editingProject, editingPhase, plannedDate, phaseMemo, showAlert]);

  // TODOに追加処理
  const handleAddTodo = useCallback(async () => {
    if (!editingProject || !editingPhase || !plannedDate) {
      showAlert("入力エラー", "予定日を設定してください");
      return;
    }

    setIsSaving(true);
    try {
      const dueDateStr = `${plannedDate.getFullYear()}-${String(plannedDate.getMonth() + 1).padStart(2, "0")}-${String(plannedDate.getDate()).padStart(2, "0")}`;
      const content = `【${editingPhase.title}】${phaseMemo || editingPhase.title}`;

      await fetch(`/api/projects/${editingProject.id}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          dueDate: dueDateStr,
        }),
      });

      showAlert("完了", "TODOに追加しました");
    } catch (error) {
      console.error("TODO追加に失敗しました:", error);
      showAlert("エラー", "TODO追加に失敗しました。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  }, [editingProject, editingPhase, plannedDate, phaseMemo, showAlert]);

  // 案件登録処理
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.manager?.trim()) {
      showAlert("入力エラー", "担当を選択してください");
      return;
    }
    setIsProjectSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectForm),
      });
      if (res.ok) {
        const newProject = await res.json();
        // 新しいプロジェクトをリストに追加
        setProjects((prev) => [...prev, { ...newProject, progressItems: [] }]);
        setProjectForm({ managementNumber: "", manager: "", client: "", projectNumber: "", completionMonth: "" });
        setProjectDialogOpen(false);
      }
    } catch (error) {
      console.error("案件登録に失敗しました:", error);
      showAlert("エラー", "案件登録に失敗しました。もう一度お試しください。");
    } finally {
      setIsProjectSubmitting(false);
    }
  };

  const formatCompletionMonth = (value: string | null | undefined) => {
    if (!value) return "";
    const [year, month] = value.split("-");
    return `${year}年${parseInt(month, 10)}月`;
  };

  const selectProjectMonth = (monthIndex: number) => {
    const monthStr = `${projectCalendarYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    setProjectForm({ ...projectForm, completionMonth: monthStr });
    setProjectCalendarOpen(false);
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
                {/* アラートサマリー */}
                {alertCount > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-red-500/10 border border-red-500/30">
                    <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                    <span className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">
                      {alertCount}件
                    </span>
                  </div>
                )}
                {/* 新規登録ボタン */}
                <Button size="sm" onClick={() => setProjectDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">新規登録</span>
                </Button>
              </div>
            </div>

            {/* テーマメッセージ */}
            <div className={cn(
              "flex items-center gap-3 p-4 rounded-xl border",
              alertCount > 0
                ? "bg-red-500/5 border-red-500/30"
                : "bg-green-500/5 border-green-500/30"
            )}>
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
                        // 行にアラートがあるかどうか（全フェーズをチェック）
                        const hasAlert = PHASES.some((_, i) => isPhaseAlert(project, i));
                        return (
                          <tr
                            key={project.id}
                            className={cn(
                              "border-b hover:bg-muted/30 transition-colors",
                              hasAlert && "bg-red-500/5"
                            )}
                          >
                            <td className={cn(
                              "sticky left-0 z-10 px-2 py-3 w-[140px]",
                              hasAlert ? "bg-red-500/10" : "bg-card"
                            )}>
                              <Link
                                href={`/projects/${project.id}`}
                                className="group flex items-center gap-1"
                              >
                                {hasAlert && (
                                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mr-1" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className={cn(
                                    "text-sm font-bold group-hover:underline truncate",
                                    hasAlert && "text-red-600 dark:text-red-400"
                                  )}>
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
                              const alertLevel = getPhaseAlertLevel(project, index);
                              const isCritical = alertLevel === "critical";
                              const isWarning = alertLevel === "warning";

                              return (
                                <td
                                  key={phase.key}
                                  className={cn(
                                    "px-0 py-2 text-center",
                                    isCritical && "bg-red-500/10",
                                    isWarning && "bg-yellow-500/10"
                                  )}
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
                                        isCritical && "bg-red-500 text-white",
                                        isWarning && "bg-yellow-500 text-white",
                                        isCurrent && !isCompleted && !isCritical && !isWarning && "bg-blue-500 text-white",
                                        !isCompleted && !isCurrent && !isCritical && !isWarning && "bg-zinc-200 dark:bg-zinc-700"
                                      )}
                                    >
                                      {isCompleted ? (
                                        <Check className="h-4 w-4" />
                                      ) : isCritical ? (
                                        <AlertTriangle className="h-4 w-4" />
                                      ) : isWarning ? (
                                        <Clock className="h-4 w-4" />
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
                                          : isCritical
                                          ? "text-red-600 dark:text-red-400"
                                          : isWarning
                                          ? "text-yellow-600 dark:text-yellow-400"
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

        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>フェーズを編集</DialogTitle>
          </DialogHeader>
          {editingProject && editingPhase && (
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
                <Label>予定日</Label>
                <Popover open={plannedCalendarOpen} onOpenChange={setPlannedCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !plannedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {plannedDate ? formatDateFull(plannedDate) : "予定日を選択"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={plannedDate}
                      onSelect={(date) => {
                        setPlannedDate(date);
                        setPlannedCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>完了日</Label>
                <Popover open={completedCalendarOpen} onOpenChange={setCompletedCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !completedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {completedDate ? formatDateFull(completedDate) : "完了日を選択"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={completedDate}
                      onSelect={(date) => {
                        setCompletedDate(date);
                        setCompletedCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>メモ</Label>
                <Textarea
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
                      className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                      onClick={handleMarkIncomplete}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      未完了に戻す
                    </Button>
                  ) : (
                    <Button
                      variant="default"
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
                    className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                    onClick={handleAddTodo}
                    disabled={isSaving}
                  >
                    <ListTodo className="h-4 w-4 mr-2" />
                    TODOに追加
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSaving}>
                    キャンセル
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving || (!plannedDate && !completedDate)}>
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 案件登録ダイアログ */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>案件を新規登録</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProjectSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="managementNumber">管理番号</Label>
              <Input
                id="managementNumber"
                value={projectForm.managementNumber}
                onChange={(e) => setProjectForm({ ...projectForm, managementNumber: e.target.value })}
                placeholder="例: P-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager">担当</Label>
              <Select
                value={projectForm.manager || undefined}
                onValueChange={(value) => setProjectForm({ ...projectForm, manager: value })}
              >
                <SelectTrigger id="manager" className="w-full">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {MANAGER_OPTIONS.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">販売先</Label>
              <Input
                id="client"
                value={projectForm.client}
                onChange={(e) => setProjectForm({ ...projectForm, client: e.target.value })}
                placeholder="例: 〇〇不動産"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectNumber">案件番号</Label>
              <Input
                id="projectNumber"
                value={projectForm.projectNumber}
                onChange={(e) => setProjectForm({ ...projectForm, projectNumber: e.target.value })}
                placeholder="例: 2026-0001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>完成月</Label>
              <Popover open={projectCalendarOpen} onOpenChange={setProjectCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {projectForm.completionMonth ? formatCompletionMonth(projectForm.completionMonth) : "選択してください"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setProjectCalendarYear(projectCalendarYear - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium">{projectCalendarYear}年</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setProjectCalendarYear(projectCalendarYear + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {MONTHS.map((month, index) => (
                      <Button
                        key={month}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9"
                        onClick={() => selectProjectMonth(index)}
                      >
                        {month}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setProjectDialogOpen(false)} disabled={isProjectSubmitting}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isProjectSubmitting}>
                {isProjectSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    登録中...
                  </>
                ) : (
                  "登録"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
