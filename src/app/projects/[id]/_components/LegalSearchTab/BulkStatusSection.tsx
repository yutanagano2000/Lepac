"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Loader2, Scale, XCircle } from "lucide-react";
import type { LegalStatuses } from "../../_types";
import { laws } from "../../_constants";

interface BulkStatusSectionProps {
  hasSearched: boolean;
  legalStatuses: LegalStatuses;
  currentUserName: string;
  isExporting: boolean;
  onBulkNotApplicable: (updates: LegalStatuses) => void;
  onReset: () => void;
  onExcelExport: () => void;
}

export function BulkStatusSection({
  hasSearched,
  legalStatuses,
  currentUserName,
  isExporting,
  onBulkNotApplicable,
  onReset,
  onExcelExport,
}: BulkStatusSectionProps) {
  if (!hasSearched) return null;

  const handleBulkNotApplicable = () => {
    const updates: LegalStatuses = { ...legalStatuses };
    laws.forEach((law) => {
      if (!updates[law.name]) {
        updates[law.name] = {
          status: "非該当",
          note: "対象地区ではありません。",
          updatedBy: currentUserName,
          updatedAt: new Date().toISOString(),
        };
      }
    });
    onBulkNotApplicable(updates);
  };

  const handleReset = () => {
    if (confirm("すべての法令ステータスをリセットしますか？")) {
      onReset();
    }
  };

  return (
    <div className="bg-card rounded-4xl border border-border shadow-lg p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">一括設定</span>
          <span className="text-xs text-muted-foreground">
            ({Object.keys(legalStatuses).length}/{laws.length} 設定済み)
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkNotApplicable}
            className="text-xs"
          >
            <CheckCircle2 className="h-3 w-3 mr-1.5 text-green-500" />
            未設定を全て非該当
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs text-muted-foreground"
          >
            <XCircle className="h-3 w-3 mr-1.5" />
            リセット
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExcelExport}
            disabled={isExporting}
            className="text-xs"
          >
            {isExporting ? (
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-3 w-3 mr-1.5" />
            )}
            {isExporting ? "出力中..." : "Excel出力"}
          </Button>
        </div>
      </div>
    </div>
  );
}
