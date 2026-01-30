"use client";

import { Button } from "@/components/ui/button";

export interface ContactDeptAlertCardProps {
  /** 法令名（カードのタイトル） */
  title: string;
  /** アラート本文 */
  message: string;
  /** Googleで検索ボタン押下時のコールバック（lawName, lawId を渡して検索） */
  onSearch: (lawName: string, lawId?: number) => void;
  /** 検索時に渡す法令名 */
  lawName: string;
  /** 検索時に渡す法令ID（担当部署クエリ追加用） */
  lawId?: number;
  className?: string;
}

/**
 * 担当部署にお問い合わせのアラートカード（黄色）。
 * 河川法・急傾斜地・砂防・地すべり・森林法などで使用。
 */
export function ContactDeptAlertCard({
  title,
  message,
  onSearch,
  lawName,
  lawId,
  className,
}: ContactDeptAlertCardProps) {
  return (
    <div
      className={
        className ??
        "bg-yellow-50 dark:bg-yellow-950/30 rounded-4xl border border-yellow-200 dark:border-yellow-800 shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
      }
    >
      <div className="flex items-stretch gap-6">
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-foreground font-medium mb-2">{title}</p>
          <p className="text-sm text-foreground">{message}</p>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => onSearch(lawName, lawId)}
            className="h-12 px-6 text-base"
          >
            Googleで検索
          </Button>
        </div>
      </div>
    </div>
  );
}
