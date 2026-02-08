"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LegalStatus, AdditionalButton } from "../../_types";

interface LawSearchCardProps {
  lawName: string;
  onSearch: (lawName: string, lawId?: number) => void;
  lawId?: number;
  fixedText?: string;
  copiedText: string | null;
  onCopy: (text: string) => void;
  additionalButtons?: AdditionalButton[];
  badges?: string[];
  caption?: string;
  /** ただし書き（コピーアイコンなしで表示） */
  note?: string;
  /** 地目に農地（田・畑）が含まれる場合の小さなアラート表示 */
  farmlandAlert?: boolean;
  /** 現在のステータス */
  currentStatus?: LegalStatus;
  /** ステータス変更時のコールバック */
  onStatusChange?: (status: LegalStatus) => void;
  /** ステータス削除時のコールバック */
  onStatusRemove?: () => void;
}

/**
 * 法令検索カードコンポーネント
 *
 * 各法令の情報表示、Google検索、ステータス管理を行う
 */
export function LawSearchCard({
  lawName,
  onSearch,
  lawId,
  fixedText,
  copiedText,
  onCopy,
  additionalButtons = [],
  badges = [],
  caption,
  note,
  farmlandAlert,
  currentStatus,
  onStatusChange,
  onStatusRemove,
}: LawSearchCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-4xl border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500",
        currentStatus === "該当" &&
          "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20",
        currentStatus === "要確認" &&
          "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20",
        currentStatus === "非該当" &&
          "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20",
        !currentStatus && "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* ヘッダー: 法令名とステータスバッジ */}
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{lawName}</p>
            {currentStatus && (
              <StatusBadge status={currentStatus} />
            )}
          </div>

          {/* 農地アラート */}
          {farmlandAlert && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              地目に農地が含まれています
            </p>
          )}

          {/* キャプション */}
          {caption && (
            <p className="text-sm text-muted-foreground mt-2">{caption}</p>
          )}

          {/* 固定テキスト（コピー可能） */}
          {fixedText && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-muted/50 border border-border">
              <p className="flex-1 text-sm text-foreground leading-relaxed">
                {fixedText}
              </p>
              <button
                onClick={() => onCopy(fixedText)}
                className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                title="コピー"
              >
                {copiedText === fixedText ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                )}
              </button>
            </div>
          )}

          {/* 注記 */}
          {note && (
            <p className="text-xs text-muted-foreground mt-2">{note}</p>
          )}

          {/* バッジ */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {badges.map((badge, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          {/* ステータス選択ボタン */}
          {onStatusChange && (
            <StatusSelector
              currentStatus={currentStatus}
              onStatusChange={onStatusChange}
              onStatusRemove={onStatusRemove}
            />
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex flex-col gap-2 shrink-0">
          <Button onClick={() => onSearch(lawName, lawId)} size="sm">
            Googleで検索
          </Button>
          {additionalButtons.map((button, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => window.open(button.url, "_blank")}
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              {button.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ステータスバッジ
function StatusBadge({ status }: { status: LegalStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        status === "該当" &&
          "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
        status === "要確認" &&
          "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
        status === "非該当" &&
          "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
      )}
    >
      {status}
    </span>
  );
}

// ステータス選択UI
function StatusSelector({
  currentStatus,
  onStatusChange,
  onStatusRemove,
}: {
  currentStatus?: LegalStatus;
  onStatusChange: (status: LegalStatus) => void;
  onStatusRemove?: () => void;
}) {
  const statuses: { value: LegalStatus; color: string }[] = [
    { value: "該当", color: "red" },
    { value: "要確認", color: "amber" },
    { value: "非該当", color: "green" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/50">
      <span className="text-xs text-muted-foreground mr-1">判定:</span>
      {statuses.map(({ value, color }) => (
        <button
          key={value}
          onClick={() => onStatusChange(value)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
            currentStatus === value
              ? `bg-${color}-500 text-white border-${color}-500`
              : `bg-transparent text-${color}-600 border-${color}-300 hover:bg-${color}-100 dark:text-${color}-400 dark:border-${color}-700 dark:hover:bg-${color}-900/30`,
            // Tailwind doesn't support dynamic class names, so we use explicit classes
            currentStatus === value && value === "該当" && "bg-red-500 text-white border-red-500",
            currentStatus === value && value === "要確認" && "bg-amber-500 text-white border-amber-500",
            currentStatus === value && value === "非該当" && "bg-green-500 text-white border-green-500",
            currentStatus !== value && value === "該当" && "bg-transparent text-red-600 border-red-300 hover:bg-red-100 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30",
            currentStatus !== value && value === "要確認" && "bg-transparent text-amber-600 border-amber-300 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/30",
            currentStatus !== value && value === "非該当" && "bg-transparent text-green-600 border-green-300 hover:bg-green-100 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/30"
          )}
        >
          {value}
        </button>
      ))}
      {currentStatus && onStatusRemove && (
        <button
          onClick={onStatusRemove}
          className="ml-1 text-xs text-muted-foreground hover:text-foreground"
          title="判定を解除"
        >
          ×
        </button>
      )}
    </div>
  );
}
