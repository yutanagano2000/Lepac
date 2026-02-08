"use client";

import { useState, useCallback } from "react";
import type { LegalStatus, LegalStatuses } from "../../../_types";

interface UseLegalStatusesOptions {
  /** プロジェクトID */
  projectId?: number;
  /** 初期ステータス（JSON文字列） */
  initialLegalStatuses?: string | null;
  /** ステータス変更時のコールバック */
  onLegalStatusesChange?: (statuses: LegalStatuses) => void;
}

interface UseLegalStatusesReturn {
  /** 現在のステータス */
  legalStatuses: LegalStatuses;
  /** 保存中フラグ */
  isSaving: boolean;
  /** 未保存の変更があるか */
  hasChanges: boolean;
  /** ステータスを更新 */
  updateLegalStatus: (lawName: string, status: LegalStatus, note?: string) => void;
  /** ステータスを削除 */
  removeLegalStatus: (lawName: string) => void;
  /** ステータスを保存 */
  saveLegalStatuses: () => Promise<void>;
}

/**
 * 法令ステータス管理フック
 */
export function useLegalStatuses(options: UseLegalStatusesOptions): UseLegalStatusesReturn {
  const { projectId, initialLegalStatuses, onLegalStatusesChange } = options;

  const [legalStatuses, setLegalStatuses] = useState<LegalStatuses>(() => {
    if (initialLegalStatuses) {
      try {
        return JSON.parse(initialLegalStatuses) as LegalStatuses;
      } catch {
        return {};
      }
    }
    return {};
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateLegalStatus = useCallback(
    (lawName: string, status: LegalStatus, note?: string) => {
      setLegalStatuses((prev) => {
        const updated = { ...prev, [lawName]: { status, note } };
        setHasChanges(true);
        return updated;
      });
    },
    []
  );

  const removeLegalStatus = useCallback((lawName: string) => {
    setLegalStatuses((prev) => {
      const updated = { ...prev };
      delete updated[lawName];
      setHasChanges(true);
      return updated;
    });
  }, []);

  const saveLegalStatuses = useCallback(async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalStatuses: JSON.stringify(legalStatuses) }),
      });
      if (response.ok) {
        setHasChanges(false);
        onLegalStatusesChange?.(legalStatuses);
      } else {
        alert("保存に失敗しました");
      }
    } catch (error) {
      console.error("保存エラー:", error);
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }, [projectId, legalStatuses, onLegalStatusesChange]);

  return {
    legalStatuses,
    isSaving,
    hasChanges,
    updateLegalStatus,
    removeLegalStatus,
    saveLegalStatuses,
  };
}
