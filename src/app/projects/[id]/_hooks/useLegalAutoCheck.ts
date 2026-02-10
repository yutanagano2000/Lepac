"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { LegalStatuses } from "../_types";

interface UseLegalAutoCheckProps {
  projectId?: number;
  setLegalStatuses: (statuses: LegalStatuses) => void;
  onLegalStatusesChange?: (statuses: LegalStatuses) => void;
}

interface AutoCheckResult {
  applied: number;
  skipped: number;
}

export function useLegalAutoCheck({
  projectId,
  setLegalStatuses,
  onLegalStatusesChange,
}: UseLegalAutoCheckProps) {
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const [autoCheckResult, setAutoCheckResult] = useState<AutoCheckResult | null>(null);

  const handleAutoCheck = useCallback(async () => {
    if (!projectId || isAutoChecking) return;
    setIsAutoChecking(true);
    setAutoCheckResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/legal-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "自動チェックに失敗しました");
        return;
      }
      const data = await res.json();
      const newStatuses = data.legalStatuses as LegalStatuses;
      setLegalStatuses(newStatuses);
      onLegalStatusesChange?.(newStatuses);
      setAutoCheckResult({
        applied: data.autoApplied?.length ?? 0,
        skipped: data.skipped ?? 0,
      });
    } catch {
      toast.error("自動チェック中にエラーが発生しました");
    } finally {
      setIsAutoChecking(false);
    }
  }, [projectId, isAutoChecking, setLegalStatuses, onLegalStatusesChange]);

  return {
    isAutoChecking,
    autoCheckResult,
    handleAutoCheck,
  };
}
