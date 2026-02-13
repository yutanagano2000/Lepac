"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { FileText, Mail, Users, MapPin, CalendarDays, Scale, Upload, Folder, PenTool, RefreshCw, Sheet, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const tools = [
  {
    href: "/meetings",
    label: "会議",
    description: "議事録の作成・閲覧",
    icon: Users,
  },
  {
    href: "/map",
    label: "マップ",
    description: "座標変換・各種マップへのリンク",
    icon: MapPin,
  },
  {
    href: "/schedule",
    label: "スケジュール",
    description: "案件のスケジュール管理",
    icon: CalendarDays,
  },
  {
    href: "/legal",
    label: "法令確認",
    description: "法令に関する確認・検索",
    icon: Scale,
  },
  {
    href: "/tools/filename",
    label: "ファイル名生成",
    description: "書類・氏名・日付からファイル名を生成",
    icon: FileText,
  },
  {
    href: "/tools/mail",
    label: "メール文面生成",
    description: "質問に答えてメール文面を自動生成",
    icon: Mail,
  },
  {
    href: "/import",
    label: "案件一括インポート",
    description: "どこでもキャビネットから案件を一括登録",
    icon: Upload,
  },
  {
    href: "/touhon",
    label: "謄本検索",
    description: "登記簿謄本を住所で検索",
    icon: Folder,
  },
  {
    href: "/map-editor",
    label: "現場案内図",
    description: "地図上で筆界をトレースして案内図を作成",
    icon: PenTool,
  },
  {
    href: "/tools/site-search",
    label: "候補地探索",
    description: "太陽光発電の候補地をスコアリング・管理",
    icon: Sun,
  },
] as const;

interface SyncStatus {
  syncedAt: string;
  totalRows: number;
  updatedCount: number;
  insertedCount: number;
  skippedCount: number;
  errorCount: number;
  durationMs: number;
}

function SheetsSyncCard() {
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
        year: "numeric",
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sheet className="h-5 w-5" />
          Googleシート同期
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          スプレッドシートからDBへ案件データを同期
        </p>

        <Button
          onClick={handleSync}
          disabled={syncing}
          size="sm"
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "同期中..." : "今すぐ同期"}
        </Button>

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
      </CardContent>
    </Card>
  );
}

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <div className="mx-auto max-w-5xl py-6 sm:py-10">
        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-semibold">ツール</h1>
            <p className="text-sm text-muted-foreground">
              業務で使う便利機能を集約しています
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.href} href={tool.href}>
                  <Card className="h-full transition-colors hover:bg-accent cursor-pointer">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {tool.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {tool.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            <SheetsSyncCard />
          </div>
        </div>
      </div>
    </div>
  );
}
