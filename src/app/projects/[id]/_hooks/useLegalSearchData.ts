"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { LegalStatuses, LegalStatus, SaveStatus } from "../_types";

interface UseLegalSearchDataProps {
  projectId?: number;
  initialLegalStatuses?: string | null;
  currentUserName: string;
  onLegalStatusesChange?: (statuses: LegalStatuses) => void;
}

export function useLegalSearchData({
  projectId,
  initialLegalStatuses,
  currentUserName,
  onLegalStatusesChange,
}: UseLegalSearchDataProps) {
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStatusesRef = useRef<LegalStatuses | null>(null);

  // 法令ステータスを保存（内部関数）
  const saveLegalStatusesInternal = useCallback(async (statusesToSave: LegalStatuses) => {
    if (!projectId) return;
    setSaveStatus("saving");
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalStatuses: JSON.stringify(statusesToSave) }),
      });
      if (response.ok) {
        setSaveStatus("saved");
        onLegalStatusesChange?.(statusesToSave);
        // 2秒後に「保存済み」表示を消す
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("保存エラー:", error);
      setSaveStatus("error");
    }
  }, [projectId, onLegalStatusesChange]);

  // デバウンス付き保存（メモ入力用: 1秒後に保存）
  const debouncedSave = useCallback((newStatuses: LegalStatuses) => {
    pendingStatusesRef.current = newStatuses;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (pendingStatusesRef.current) {
        saveLegalStatusesInternal(pendingStatusesRef.current);
        pendingStatusesRef.current = null;
      }
    }, 1000);
  }, [saveLegalStatusesInternal]);

  // 即時保存（ステータスボタン用）
  const immediateSave = useCallback((newStatuses: LegalStatuses) => {
    // 保留中のデバウンスをキャンセル
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    pendingStatusesRef.current = null;
    saveLegalStatusesInternal(newStatuses);
  }, [saveLegalStatusesInternal]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // 法令ステータスを更新（即時保存）
  const updateLegalStatus = useCallback((lawName: string, status: LegalStatus, note?: string) => {
    setLegalStatuses(prev => {
      const existing = prev[lawName];
      const updatedNote = note !== undefined ? note : existing?.note;
      const updated = {
        ...prev,
        [lawName]: {
          ...existing,
          status,
          note: updatedNote,
          updatedBy: currentUserName,
          updatedAt: new Date().toISOString(),
        }
      };
      // ステータス変更は即時保存
      immediateSave(updated);
      return updated;
    });
  }, [currentUserName, immediateSave]);

  // 法令メモを更新（デバウンス保存）
  const updateLegalNote = useCallback((lawName: string, note: string) => {
    setLegalStatuses(prev => {
      const existing = prev[lawName];
      const status = existing?.status || "要確認";
      const updated = {
        ...prev,
        [lawName]: {
          ...existing,
          status,
          note,
          updatedBy: currentUserName,
          updatedAt: new Date().toISOString(),
        }
      };
      // メモ変更はデバウンス保存
      debouncedSave(updated);
      return updated;
    });
  }, [currentUserName, debouncedSave]);

  // 法令の追加フィールドを更新（デバウンス保存）
  const updateLegalField = useCallback((lawName: string, field: string, value: string) => {
    setLegalStatuses(prev => {
      const existing = prev[lawName];
      const status = existing?.status || "要確認";
      const updated = {
        ...prev,
        [lawName]: {
          ...existing,
          status,
          [field]: value,
          updatedBy: currentUserName,
          updatedAt: new Date().toISOString(),
        }
      };
      debouncedSave(updated);
      return updated;
    });
  }, [currentUserName, debouncedSave]);

  // 法令ステータスを削除（即時保存）
  const removeLegalStatus = useCallback((lawName: string) => {
    setLegalStatuses(prev => {
      const updated = { ...prev };
      delete updated[lawName];
      // 削除は即時保存
      immediateSave(updated);
      return updated;
    });
  }, [immediateSave]);

  // 手動再試行用
  const retrySave = useCallback(() => {
    saveLegalStatusesInternal(legalStatuses);
  }, [saveLegalStatusesInternal, legalStatuses]);

  return {
    legalStatuses,
    setLegalStatuses,
    saveStatus,
    updateLegalStatus,
    updateLegalNote,
    updateLegalField,
    removeLegalStatus,
    retrySave,
    immediateSave,
  };
}
