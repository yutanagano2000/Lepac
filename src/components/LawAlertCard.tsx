"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeWindowOpen } from "@/lib/sanitize";

export interface LawAlertCardProps {
  /** 法令名（カードのタイトル） */
  title: string;
  /** アラート本文 */
  message: string;
  /** 「詳細はこちら」のリンク先URL */
  detailUrl: string;
  /** リスト用の key は親で付与する想定 */
  className?: string;
  /** 琥珀色（既定）または赤 */
  variant?: "amber" | "red";
}

/**
 * 現地住所に応じて表示する法令アラートカード。
 * 土壌汚染対策法（福山市対象地区）など、条件を満たすときのみ親で差し替えて表示する。
 */
const variantClasses = {
  amber:
    "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  red: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
};

export function LawAlertCard({
  title,
  message,
  detailUrl,
  className,
  variant = "amber",
}: LawAlertCardProps) {
  const base =
    className ??
    `rounded-4xl border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${variantClasses[variant]}`;
  return (
    <div className={base}>
      <div className="flex items-stretch gap-6">
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-foreground font-medium mb-2">{title}</p>
          <p className="text-sm text-foreground">{message}</p>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => safeWindowOpen(detailUrl)}
            className="h-12 px-6 text-base"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            詳細はこちら
          </Button>
        </div>
      </div>
    </div>
  );
}
