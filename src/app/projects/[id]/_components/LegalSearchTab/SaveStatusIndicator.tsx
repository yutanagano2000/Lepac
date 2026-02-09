"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "../../_types";

interface SaveStatusIndicatorProps {
  projectId?: number;
  saveStatus: SaveStatus;
  onRetry: () => void;
}

export function SaveStatusIndicator({
  projectId,
  saveStatus,
  onRetry,
}: SaveStatusIndicatorProps) {
  if (!projectId || saveStatus === "idle") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-medium transition-all",
        saveStatus === "saving" && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
        saveStatus === "saved" && "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
        saveStatus === "error" && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
      )}>
        {saveStatus === "saving" && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            保存中...
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <CheckCircle2 className="h-4 w-4" />
            保存しました
          </>
        )}
        {saveStatus === "error" && (
          <>
            <XCircle className="h-4 w-4" />
            保存失敗
            <button
              onClick={onRetry}
              className="ml-2 px-2 py-0.5 rounded bg-red-200 hover:bg-red-300 dark:bg-red-800 dark:hover:bg-red-700 text-xs"
            >
              再試行
            </button>
          </>
        )}
      </div>
    </div>
  );
}
