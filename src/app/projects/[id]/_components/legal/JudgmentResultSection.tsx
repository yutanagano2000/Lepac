"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "./ProjectInfoDisplay";
import { LEGAL_TEMPLATES } from "../../_constants";

interface JudgmentItemProps {
  label: string;
  isInArea: boolean;
  template: string;
  copiedText: string | null;
  onCopy: (text: string) => void;
}

function JudgmentItem({
  label,
  isInArea,
  template,
  copiedText,
  onCopy,
}: JudgmentItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            isInArea
              ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
              : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
          }`}
        >
          {isInArea ? "区域内" : "区域外"}
        </span>
        {isInArea && (
          <CopyButton text={template} copiedText={copiedText} onCopy={onCopy} />
        )}
      </div>
    </div>
  );
}

interface JudgmentResultSectionProps {
  result: { 宅地造成等工事規制区域: boolean; 特定盛土等規制区域: boolean };
  copiedText: string | null;
  onCopy: (text: string) => void;
}

export function JudgmentResultSection({
  result,
  copiedText,
  onCopy,
}: JudgmentResultSectionProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <h2 className="text-lg font-semibold">判定結果</h2>

        <div className="space-y-2">
          <JudgmentItem
            label="宅地造成等工事規制区域"
            isInArea={result.宅地造成等工事規制区域}
            template={LEGAL_TEMPLATES.宅地造成等工事規制区域}
            copiedText={copiedText}
            onCopy={onCopy}
          />
          <JudgmentItem
            label="特定盛土等規制区域"
            isInArea={result.特定盛土等規制区域}
            template={LEGAL_TEMPLATES.特定盛土等規制区域}
            copiedText={copiedText}
            onCopy={onCopy}
          />
        </div>
      </CardContent>
    </Card>
  );
}
