"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { LawSearchCardProps } from "../_types";

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
}: LawSearchCardProps) {
  return (
    <div className="bg-card rounded-4xl border border-border shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-foreground">{lawName}</p>
          {farmlandAlert && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              地目に農地が含まれています
            </p>
          )}
          {caption && (
            <p className="text-sm text-muted-foreground mt-2">{caption}</p>
          )}
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
          {note && <p className="text-xs text-muted-foreground mt-2">{note}</p>}
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
        </div>
        <div className="flex flex-col gap-2 shrink-0 ml-4">
          <Button onClick={() => onSearch(lawName, lawId)} className="w-full">
            Googleで検索
          </Button>
          {additionalButtons.map((button, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => window.open(button.url, "_blank")}
              className="w-full"
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
