"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface UseDebouncedSaveOptions<T> {
  /** デバウンス遅延時間（ミリ秒）。デフォルト: 1000ms */
  delay?: number;
  /** 保存関数 */
  onSave: (data: T) => Promise<void>;
  /** 保存成功時のコールバック */
  onSuccess?: () => void;
  /** 保存失敗時のコールバック */
  onError?: (error: unknown) => void;
  /** 「保存済み」表示を維持する時間（ミリ秒）。デフォルト: 2000ms */
  savedDuration?: number;
}

interface UseDebouncedSaveReturn<T> {
  /** 現在のステータス */
  status: SaveStatus;
  /** 未保存の変更があるか */
  hasUnsavedChanges: boolean;
  /** 変更をキューに追加（デバウンス付き自動保存） */
  queueSave: (data: T) => void;
  /** 即座に保存を実行 */
  saveNow: (data: T) => Promise<void>;
  /** 保留中の保存をキャンセル */
  cancel: () => void;
  /** ステータスをリセット */
  reset: () => void;
}

/**
 * デバウンス付き保存戦略を提供するフック
 *
 * @example
 * ```tsx
 * const { status, hasUnsavedChanges, queueSave, saveNow } = useDebouncedSave({
 *   delay: 1500,
 *   onSave: async (data) => {
 *     await fetch('/api/save', {
 *       method: 'PUT',
 *       body: JSON.stringify(data),
 *     });
 *   },
 *   onSuccess: () => console.log('保存完了'),
 *   onError: (err) => console.error('保存失敗:', err),
 * });
 *
 * // 入力変更時にデバウンス付き保存をキュー
 * const handleChange = (value: string) => {
 *   setData({ ...data, field: value });
 *   queueSave({ ...data, field: value });
 * };
 *
 * // ステータス表示
 * {status === 'saving' && <span>保存中...</span>}
 * {status === 'saved' && <span>保存済み</span>}
 * {hasUnsavedChanges && <span>未保存の変更があります</span>}
 * ```
 */
export function useDebouncedSave<T>(
  options: UseDebouncedSaveOptions<T>
): UseDebouncedSaveReturn<T> {
  const {
    delay = 1000,
    onSave,
    onSuccess,
    onError,
    savedDuration = 2000,
  } = options;

  const [status, setStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<T | null>(null);

  const hasUnsavedChanges = status === "pending" || latestDataRef.current !== null;

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = null;
    }
  }, []);

  const executeSave = useCallback(
    async (data: T) => {
      setStatus("saving");
      try {
        await onSave(data);
        latestDataRef.current = null;
        setStatus("saved");
        onSuccess?.();

        // 一定時間後にステータスをidleに戻す
        savedTimeoutRef.current = setTimeout(() => {
          setStatus("idle");
        }, savedDuration);
      } catch (error) {
        setStatus("error");
        onError?.(error);
      }
    },
    [onSave, onSuccess, onError, savedDuration]
  );

  const queueSave = useCallback(
    (data: T) => {
      latestDataRef.current = data;
      setStatus("pending");
      clearTimeouts();

      timeoutRef.current = setTimeout(() => {
        if (latestDataRef.current !== null) {
          executeSave(latestDataRef.current);
        }
      }, delay);
    },
    [delay, clearTimeouts, executeSave]
  );

  const saveNow = useCallback(
    async (data: T) => {
      clearTimeouts();
      latestDataRef.current = null;
      await executeSave(data);
    },
    [clearTimeouts, executeSave]
  );

  const cancel = useCallback(() => {
    clearTimeouts();
    latestDataRef.current = null;
    setStatus("idle");
  }, [clearTimeouts]);

  const reset = useCallback(() => {
    clearTimeouts();
    latestDataRef.current = null;
    setStatus("idle");
  }, [clearTimeouts]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    status,
    hasUnsavedChanges,
    queueSave,
    saveNow,
    cancel,
    reset,
  };
}
