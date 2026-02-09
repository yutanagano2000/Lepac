"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";

interface AutoCheckSectionProps {
  projectId?: number;
  isAutoChecking: boolean;
  autoCheckResult: { applied: number; skipped: number } | null;
  onAutoCheck: () => void;
}

export function AutoCheckSection({
  projectId,
  isAutoChecking,
  autoCheckResult,
  onAutoCheck,
}: AutoCheckSectionProps) {
  if (!projectId) return null;

  return (
    <div className="bg-card rounded-4xl border border-border shadow-lg p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">法令自動チェック</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            座標・住所・地目から自動で法令を判定します（手動入力済みの法令は上書きしません）
          </p>
          {autoCheckResult && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {autoCheckResult.applied}件を自動設定しました{autoCheckResult.skipped > 0 && `（${autoCheckResult.skipped}件は既に入力済みのためスキップ）`}
            </p>
          )}
        </div>
        <Button
          size="sm"
          onClick={onAutoCheck}
          disabled={isAutoChecking}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isAutoChecking ? (
            <>
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              チェック中...
            </>
          ) : (
            <>
              <Wand2 className="h-3 w-3 mr-1.5" />
              自動チェック実行
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
