"use client";

import { useMemo } from "react";
import { Calendar, CheckCircle2, Clock, AlertTriangle, FileText, FolderOpen, ExternalLink, FileSignature, ClipboardList, Scale, Zap, Home, Package, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Project, Progress } from "@/db/schema";

// 進捗ステップの定義
const PROGRESS_STEPS = [
  "合意書",
  "案件提出",
  "現調",
  "土地売買契約",
  "土地契約",
  "法令申請",
  "法令許可",
  "電力申請",
  "電力回答",
  "SS依頼",
  "SS実施",
  "土地決済",
  "発注",
  "着工",
  "連系",
  "完工",
] as const;

// 必要書類チェック項目
const DOCUMENT_CHECKS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "agreementMonth", label: "合意書", icon: FileSignature },
  { key: "landContractDate", label: "土地契約", icon: ClipboardList },
  { key: "regulationPermitDate", label: "法令許可", icon: Scale },
  { key: "powerResponseDate", label: "電力回答", icon: Zap },
  { key: "landSettlementDate", label: "土地決済", icon: Home },
  { key: "orderDate", label: "発注", icon: Package },
];

// サブフォルダ定義
const SUBFOLDERS = [
  { name: "01_合意書", icon: "📝" },
  { name: "02_土地情報", icon: "🗺️" },
  { name: "03_図面", icon: "📐" },
  { name: "04_発電シミュレーション", icon: "☀️" },
  { name: "05_法令関係", icon: "⚖️" },
  { name: "06_電力申請", icon: "⚡" },
  { name: "07_材料発注", icon: "📦" },
  { name: "08_工事関係", icon: "🔧" },
  { name: "09_連系資料", icon: "🔌" },
  { name: "10_土地決済・所有権移転", icon: "🏠" },
] as const;

interface ProjectDashboardProps {
  project: Project;
  progressList: Progress[];
}

export function ProjectDashboard({ project, progressList }: ProjectDashboardProps) {
  // 連系予定日までの残日数を計算
  const daysUntilInterconnection = useMemo(() => {
    const interconnectionDate = project.interconnectionScheduled || project.interconnectionDate;
    if (!interconnectionDate) return null;

    const target = new Date(interconnectionDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [project.interconnectionScheduled, project.interconnectionDate]);

  // 進捗状況の計算
  const progressStats = useMemo(() => {
    const completedSteps = progressList.filter((p) => p.status === "completed");
    const completedTitles = new Set(completedSteps.map((p) => p.title));

    let lastCompletedIndex = -1;
    PROGRESS_STEPS.forEach((step, index) => {
      if (completedTitles.has(step)) {
        lastCompletedIndex = index;
      }
    });

    return {
      completed: completedSteps.length,
      total: PROGRESS_STEPS.length,
      percentage: Math.round((completedSteps.length / PROGRESS_STEPS.length) * 100),
      lastCompletedIndex,
      completedTitles,
    };
  }, [progressList]);

  // 書類チェック状況
  const documentStatus = useMemo(() => {
    return DOCUMENT_CHECKS.map((doc) => {
      const value = project[doc.key as keyof Project];
      return {
        ...doc,
        completed: !!value,
        value: value as string | null,
      };
    });
  }, [project]);

  const completedDocs = documentStatus.filter((d) => d.completed).length;

  // どこキャビリンクからベースパスを抽出
  const baseFolderPath = useMemo(() => {
    if (!project.dococabiLink) return null;
    // どこキャビリンクの形式に応じてパス抽出（仮の実装）
    return project.dococabiLink;
  }, [project.dococabiLink]);

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
      {/* 進捗インジケーター */}
      <Card className="lg:col-span-2">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">進捗状況</h3>
            </div>
            <span className="text-sm font-medium text-primary">
              {progressStats.percentage}% ({progressStats.completed}/{progressStats.total})
            </span>
          </div>

          {/* プログレスバー */}
          <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressStats.percentage}%` }}
            />
          </div>

          {/* ステップインジケーター（コンパクト版） */}
          <div className="flex flex-wrap gap-1.5">
            {PROGRESS_STEPS.map((step, index) => {
              const isCompleted = progressStats.completedTitles.has(step);
              const isCurrent = index === progressStats.lastCompletedIndex + 1;

              return (
                <div
                  key={step}
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium transition-colors",
                    isCompleted
                      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                      : isCurrent
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 ring-2 ring-blue-300 dark:ring-blue-700"
                      : "bg-muted text-muted-foreground"
                  )}
                  title={step}
                >
                  {step}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 連系カウントダウン */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">連系予定</h3>
          </div>

          {daysUntilInterconnection !== null ? (
            <div className="text-center py-2">
              <div
                className={cn(
                  "text-4xl font-bold mb-1",
                  daysUntilInterconnection < 0
                    ? "text-red-500"
                    : daysUntilInterconnection <= 30
                    ? "text-amber-500"
                    : "text-green-500"
                )}
              >
                {Math.abs(daysUntilInterconnection)}
              </div>
              <div className="text-sm text-muted-foreground">
                {daysUntilInterconnection < 0
                  ? "日超過"
                  : daysUntilInterconnection === 0
                  ? "本日"
                  : "日後"}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {project.interconnectionScheduled || project.interconnectionDate}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">連系予定日未設定</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 書類チェックリスト */}
      <Card className="lg:col-span-2">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">重要マイルストーン</h3>
            </div>
            <span className="text-xs text-muted-foreground">
              {completedDocs}/{documentStatus.length} 完了
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {documentStatus.map((doc) => (
              <div
                key={doc.key}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                  doc.completed
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                    : "bg-muted/30 border-border"
                )}
              >
                <doc.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs font-medium truncate",
                      doc.completed ? "text-green-800 dark:text-green-200" : "text-muted-foreground"
                    )}
                  >
                    {doc.label}
                  </p>
                  {doc.completed && doc.value && (
                    <p className="text-[10px] text-green-600 dark:text-green-400 truncate">
                      {doc.value}
                    </p>
                  )}
                </div>
                {doc.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* サブフォルダクイックアクセス */}
      {baseFolderPath && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">フォルダ</h3>
            </div>

            <div className="space-y-1">
              {SUBFOLDERS.slice(0, 5).map((folder) => (
                <Button
                  key={folder.name}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    // どこキャビリンクにサブフォルダパスを追加して開く
                    const url = `${baseFolderPath}/${encodeURIComponent(folder.name)}`;
                    window.open(url, "_blank");
                  }}
                >
                  <span className="mr-2">{folder.icon}</span>
                  <span className="truncate">{folder.name}</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                </Button>
              ))}
              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground px-2 py-1">
                  その他のフォルダ...
                </summary>
                <div className="mt-1 space-y-1">
                  {SUBFOLDERS.slice(5).map((folder) => (
                    <Button
                      key={folder.name}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={() => {
                        const url = `${baseFolderPath}/${encodeURIComponent(folder.name)}`;
                        window.open(url, "_blank");
                      }}
                    >
                      <span className="mr-2">{folder.icon}</span>
                      <span className="truncate">{folder.name}</span>
                      <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                    </Button>
                  ))}
                </div>
              </details>
            </div>
          </CardContent>
        </Card>
      )}

      {/* アラート表示（期限切れ・要注意項目） */}
      {daysUntilInterconnection !== null && daysUntilInterconnection < 0 && (
        <Card className="lg:col-span-3 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  連系予定日を {Math.abs(daysUntilInterconnection)} 日超過しています
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  連系予定日: {project.interconnectionScheduled || project.interconnectionDate}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
