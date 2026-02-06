"use client";

import { useState, useEffect } from "react";
import { Camera, RefreshCw, AlertCircle, CheckCircle2, XCircle, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectPhotoGalleryProps {
  projectNumber: string | null;
}

export function ProjectPhotoGallery({ projectNumber }: ProjectPhotoGalleryProps) {
  const [photoCount, setPhotoCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const fetchPhotos = async () => {
    if (!projectNumber) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/filesystem?action=getPhotos&projectNumber=${encodeURIComponent(projectNumber)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "写真の取得に失敗しました");
        return;
      }

      setPhotoCount(data.photos?.length || 0);
      setFolderPath(data.folderPath);
    } catch (err) {
      setError("ファイルサーバーに接続できません");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectNumber) {
      fetchPhotos();
    }
  }, [projectNumber]);

  const copyPath = async () => {
    if (!folderPath) return;
    try {
      await navigator.clipboard.writeText(folderPath);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      alert("コピーに失敗しました");
    }
  };

  const openInExplorer = async () => {
    if (!folderPath) return;
    try {
      await fetch("/api/filesystem/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: folderPath }),
      });
    } catch (err) {
      console.error("エクスプローラーを開けませんでした:", err);
    }
  };

  if (!projectNumber) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Camera className="h-4 w-4" />
            現場写真
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            確認中...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Camera className="h-4 w-4" />
            現場写真
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={fetchPhotos}>
            <RefreshCw className="h-3 w-3 mr-1" />
            再試行
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasPhotos = photoCount > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Camera className="h-4 w-4" />
            現場写真
          </CardTitle>
          <Badge variant={hasPhotos ? "default" : "secondary"} className="text-xs">
            {photoCount}枚
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg border",
          hasPhotos
            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
            : "bg-zinc-50 border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700"
        )}>
          {hasPhotos ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-zinc-400 shrink-0" />
          )}
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium",
              hasPhotos ? "text-green-800 dark:text-green-200" : "text-muted-foreground"
            )}>
              {hasPhotos ? "現地調査済み" : "未調査"}
            </p>
            {hasPhotos && (
              <p className="text-xs text-green-600 dark:text-green-400">
                写真フォルダに {photoCount} 枚の写真があります
              </p>
            )}
          </div>
          {folderPath && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-7 px-2", copySuccess && "text-green-600")}
                onClick={copyPath}
                title="パスをコピー"
              >
                {copySuccess ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={openInExplorer}
                title="フォルダを開く"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
