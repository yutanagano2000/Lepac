"use client";

import { Button } from "@/components/ui/button";
import { Check, CheckCircle2, Copy, Loader2, XCircle } from "lucide-react";
import type { JudgmentResult } from "../../_types";
import { TEMPLATES } from "../../_constants";

interface JudgmentResultSectionProps {
  hasSearched: boolean;
  isLoading: boolean;
  result: JudgmentResult | null;
  isHiroshima: boolean;
  projectAddress: string | null;
  coordinates: { lat: string; lon: string } | null;
  copiedText: string | null;
  onCopy: (text: string) => void;
}

export function JudgmentResultSection({
  hasSearched,
  isLoading,
  result,
  isHiroshima,
  projectAddress,
  coordinates,
  copiedText,
  onCopy,
}: JudgmentResultSectionProps) {
  if (!hasSearched) return null;

  return (
    <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-xl font-semibold text-foreground mb-4">判定結果</h2>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          判定中...
        </div>
      ) : result ? (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
              <div className="flex-1">
                <p className="font-medium text-foreground">宅地造成等工事規制区域</p>
              </div>
              <div className="flex items-center gap-2">
                {result.宅地造成等工事規制区域 ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <span className="font-semibold text-green-500">該当します</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-500" />
                    <span className="font-semibold text-muted-foreground">該当しません</span>
                  </>
                )}
              </div>
            </div>

            {result.宅地造成等工事規制区域 && (
              <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
                <p className="flex-1 text-sm text-foreground leading-relaxed">
                  {TEMPLATES.宅地造成等工事規制区域}
                </p>
                <button
                  onClick={() => onCopy(TEMPLATES.宅地造成等工事規制区域)}
                  className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                  title="コピー"
                >
                  {copiedText === TEMPLATES.宅地造成等工事規制区域 ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {isHiroshima && (
              <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-600 p-4">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  広島県は未対応です
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  特定盛土等規制区域の判定は広島県では提供しておりません。
                </p>
              </div>
            )}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
              <div className="flex-1">
                <p className="font-medium text-foreground">特定盛土等規制区域</p>
              </div>
              <div className="flex items-center gap-2">
                {result.特定盛土等規制区域 ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <span className="font-semibold text-green-500">該当します</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-500" />
                    <span className="font-semibold text-muted-foreground">該当しません</span>
                  </>
                )}
              </div>
            </div>

            {result.特定盛土等規制区域 && (
              <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
                <p className="flex-1 text-sm text-foreground leading-relaxed">
                  {TEMPLATES.特定盛土等規制区域}
                </p>
                <button
                  onClick={() => onCopy(TEMPLATES.特定盛土等規制区域)}
                  className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                  title="コピー"
                >
                  {copiedText === TEMPLATES.特定盛土等規制区域 ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
              </div>
            )}
          </div>

          {coordinates && (
            <div className="pt-2 border-t border-border mt-4">
              <p className="text-sm text-muted-foreground">
                判定座標: {projectAddress && `${projectAddress}, `}緯度 {coordinates.lat}, 経度 {coordinates.lon}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-muted-foreground">
          判定結果がありません
        </div>
      )}
    </div>
  );
}
