"use client";

import {
  GitBranch,
  Search,
  Flame,
  Plus,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TimelineHeaderProps {
  alertCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewProject: () => void;
}

export function TimelineHeader({
  alertCount,
  searchQuery,
  onSearchChange,
  onNewProject,
}: TimelineHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">タイムライン</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* アラートサマリー */}
          {alertCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <Flame className="h-5 w-5 text-red-500" />
              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                {alertCount}件のアラート
              </span>
            </div>
          )}
          {/* 新規登録ボタン */}
          <Button size="sm" onClick={onNewProject}>
            <Plus className="h-4 w-4" />
            新規登録
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
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
    </div>
  );
}

/** 凡例コンポーネント */
export function TimelineLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <span className="font-medium text-red-600 dark:text-red-400">アラート</span>
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
  );
}
