"use client";

import { useMemo } from "react";
import { Calendar, Clock, AlertTriangle, FolderOpen, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isSafeUrl } from "@/lib/sanitize";
import type { Project, Progress } from "@/db/schema";

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

export function ProjectDashboard({ project }: ProjectDashboardProps) {
  // 連系予定日までの残日数を計算
  const daysUntilInterconnection = useMemo(() => {
    const interconnectionDate = project.interconnectionScheduled || project.interconnectionDate;
    if (!interconnectionDate) return null;

    const target = new Date(interconnectionDate);
    if (isNaN(target.getTime())) return null;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [project.interconnectionScheduled, project.interconnectionDate]);

  // どこキャビリンクからベースパスを抽出
  const baseFolderPath = useMemo(() => {
    if (!project.dococabiLink) return null;
    return project.dococabiLink;
  }, [project.dococabiLink]);

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {/* 連系カウントダウン */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-base">連系予定</h3>
          </div>

          {daysUntilInterconnection !== null ? (
            <div className="text-center py-3">
              <div
                className={cn(
                  "text-5xl font-bold mb-1",
                  daysUntilInterconnection < 0
                    ? "text-red-500"
                    : daysUntilInterconnection <= 30
                    ? "text-amber-500"
                    : "text-green-500"
                )}
              >
                {Math.abs(daysUntilInterconnection)}
              </div>
              <div className="text-base text-muted-foreground">
                {daysUntilInterconnection < 0
                  ? "日超過"
                  : daysUntilInterconnection === 0
                  ? "本日"
                  : "日後"}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {project.interconnectionScheduled || project.interconnectionDate}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-base text-muted-foreground">連系予定日未設定</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* サブフォルダクイックアクセス */}
      {baseFolderPath && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-base">フォルダ</h3>
            </div>

            <div className="space-y-1">
              {SUBFOLDERS.slice(0, 5).map((folder) => (
                <Button
                  key={folder.name}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-9 text-sm"
                  onClick={() => {
                    const url = `${baseFolderPath}/${encodeURIComponent(folder.name)}`;
                    if (isSafeUrl(url)) window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <span className="mr-2">{folder.icon}</span>
                  <span className="truncate">{folder.name}</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                </Button>
              ))}
              <details className="group">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground px-2 py-1">
                  その他のフォルダ...
                </summary>
                <div className="mt-1 space-y-1">
                  {SUBFOLDERS.slice(5).map((folder) => (
                    <Button
                      key={folder.name}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 text-sm"
                      onClick={() => {
                        const url = `${baseFolderPath}/${encodeURIComponent(folder.name)}`;
                        if (isSafeUrl(url)) window.open(url, "_blank", "noopener,noreferrer");
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
        <Card className="sm:col-span-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <div>
                <p className="font-medium text-base text-red-800 dark:text-red-200">
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
