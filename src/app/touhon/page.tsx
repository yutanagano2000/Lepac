"use client";

import { useState, useCallback } from "react";
import { Search, FileText, Download, Folder, RefreshCw, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TouhonFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
}

export default function TouhonPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [files, setFiles] = useState<TouhonFile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchTouhon = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const url = searchQuery.trim()
        ? `/api/filesystem?action=searchTouhon&query=${encodeURIComponent(searchQuery.trim())}`
        : `/api/filesystem?action=searchTouhon`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "検索に失敗しました");
        return;
      }

      setFiles(data.files);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError("ファイルサーバーに接続できません");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      searchTouhon();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const openFile = (file: TouhonFile) => {
    // ファイルを開く（file://プロトコル）
    const basePath = "C:\\Person Energy\\◇Person独自案件管理\\□Person独自案件\\■謄本";
    const fullPath = `${basePath}\\${file.path}`;
    const fileUrl = `file:///${fullPath.replace(/\\/g, "/")}`;
    window.open(fileUrl, "_blank");
  };

  // 住所情報を抽出（ファイル名から）
  const extractAddressInfo = (fileName: string): { city: string; address: string } | null => {
    // 例: "三次市三和町下板木１０３０１不動産登記（土地全部事項）2025121000281534.PDF"
    const match = fileName.match(/^(.+?市.+?)不動産登記/);
    if (match) {
      const fullAddress = match[1];
      const cityMatch = fullAddress.match(/^(.+?市)/);
      return {
        city: cityMatch ? cityMatch[1] : "",
        address: fullAddress,
      };
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <div className="mx-auto max-w-4xl py-6 sm:py-10">
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              謄本検索
            </h1>
            <p className="text-sm text-muted-foreground">
              登記簿謄本を住所で検索できます
            </p>
          </div>

          {/* 検索フォーム */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="住所を入力（例: 三次市、井原市七日市町）"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-9"
                  />
                </div>
                <Button onClick={searchTouhon} disabled={loading}>
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">検索</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* エラー表示 */}
          {error && (
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 検索結果 */}
          {hasSearched && !error && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    検索結果
                  </span>
                  <Badge variant="secondary">
                    {totalCount > 100 ? `100件以上（${totalCount}件中100件表示）` : `${totalCount}件`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    該当する謄本が見つかりません
                  </p>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {files.map((file, index) => {
                        const addressInfo = extractAddressInfo(file.name);
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => openFile(file)}
                          >
                            <FileText className="h-8 w-8 text-red-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" title={file.name}>
                                {addressInfo?.address || file.name}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                {addressInfo?.city && (
                                  <Badge variant="outline" className="text-xs">
                                    {addressInfo.city}
                                  </Badge>
                                )}
                                <span>{formatFileSize(file.size)}</span>
                                <span>{formatDate(file.modifiedAt)}</span>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="shrink-0">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}

          {/* 使い方 */}
          {!hasSearched && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">使い方</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1. 検索したい住所（市区町村名、町名など）を入力</p>
                <p>2. 検索ボタンをクリック、またはEnterキーを押す</p>
                <p>3. 結果をクリックするとPDFが開きます</p>
                <p className="text-xs mt-4 pt-4 border-t">
                  ※ ファイルサーバー（どこでもキャビネット）に接続されている必要があります
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
