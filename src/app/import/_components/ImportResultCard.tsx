"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ImportResult } from "../_types";

interface ImportResultCardProps {
  importResults: ImportResult[];
  successCount: number;
  failureCount: number;
}

export function ImportResultCard({
  importResults,
  successCount,
  failureCount,
}: ImportResultCardProps) {
  if (importResults.length === 0) return null;

  return (
    <Card
      className={
        successCount > 0 && failureCount === 0
          ? "border-green-200 dark:border-green-800"
          : ""
      }
    >
      <CardHeader>
        <CardTitle className="text-sm font-medium">インポート結果</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            成功: {successCount}件
          </Badge>
          {failureCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
            >
              <XCircle className="h-3 w-3 mr-1" />
              失敗: {failureCount}件
            </Badge>
          )}
        </div>
        {failureCount > 0 && (
          <div className="space-y-2">
            {importResults
              .filter((r) => !r.success)
              .map((result, index) => (
                <div
                  key={index}
                  className="text-sm text-red-600 flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">{result.folderName}</span>
                  <span className="text-xs">- {result.error}</span>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
