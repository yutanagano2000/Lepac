"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SyncStatus {
  syncedAt: string;
  totalRows: number;
  updatedCount: number;
  insertedCount: number;
  skippedCount: number;
  errorCount: number;
  durationMs: number;
}

interface SheetsSyncButtonProps {
  onSyncComplete?: () => void;
}

export function SheetsSyncButton({ onSyncComplete }: SheetsSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/sheets");
      if (res.ok) {
        const data = await res.json();
        if (data.status) setLastSync(data.status);
      }
    } catch {
      // ステータス取得失敗は無視
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/sync/sheets", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "同期に失敗しました");
      } else {
        setLastSync({
          syncedAt: new Date().toISOString(),
          totalRows: data.result.totalRows,
          updatedCount: data.result.updatedCount,
          insertedCount: data.result.insertedCount,
          skippedCount: data.result.skippedCount,
          errorCount: data.result.errorCount,
          durationMs: data.result.durationMs,
        });
        onSyncComplete?.();
      }
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          <Sheet className="h-4 w-4" />
          {syncing ? "同期中..." : "シート同期"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Sheet className="h-4 w-4" />
            Googleシート同期
          </p>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {lastSync && (
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>最終同期: {formatDate(lastSync.syncedAt)}</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">{lastSync.totalRows}行</Badge>
                {lastSync.insertedCount > 0 && (
                  <Badge variant="default">+{lastSync.insertedCount}件</Badge>
                )}
                {lastSync.updatedCount > 0 && (
                  <Badge variant="outline">{lastSync.updatedCount}更新</Badge>
                )}
                {lastSync.errorCount > 0 && (
                  <Badge variant="destructive">{lastSync.errorCount}エラー</Badge>
                )}
              </div>
              <p>{(lastSync.durationMs / 1000).toFixed(1)}秒</p>
            </div>
          )}

          {!lastSync && !error && (
            <p className="text-xs text-muted-foreground">同期ステータスなし</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
