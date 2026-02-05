"use client";

import { useState, useCallback } from "react";
import { Folder, Upload, RefreshCw, AlertCircle, CheckCircle2, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FolderInfo {
  folderName: string;
  managementNumber: string | null;
  manager: string | null;
  projectNumber: string | null;
  note: string | null;
}

interface ImportResult {
  success: boolean;
  folderName: string;
  error?: string;
}

export default function ImportPage() {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const res = await fetch("/api/filesystem?action=listAllProjects");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "フォルダ一覧の取得に失敗しました");
        return;
      }

      setFolders(data.folders);
    } catch (err) {
      setError("ファイルサーバーに接続できません");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFolder = (folderName: string) => {
    setSelectedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  };

  const selectAll = () => {
    const validFolders = folders.filter(f => f.managementNumber && f.projectNumber);
    setSelectedFolders(new Set(validFolders.map(f => f.folderName)));
  };

  const clearSelection = () => {
    setSelectedFolders(new Set());
  };

  const handleImport = async () => {
    setShowConfirmDialog(false);
    setImporting(true);
    setImportResults([]);

    const results: ImportResult[] = [];

    for (const folderName of selectedFolders) {
      const folder = folders.find(f => f.folderName === folderName);
      if (!folder || !folder.managementNumber || !folder.projectNumber) {
        results.push({ success: false, folderName, error: "フォルダ情報が不完全です" });
        continue;
      }

      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            managementNumber: folder.managementNumber,
            manager: folder.manager || "",
            projectNumber: folder.projectNumber,
            client: "", // 空欄
            completionMonth: extractCompletionMonth(folder.note),
          }),
        });

        if (res.ok) {
          results.push({ success: true, folderName });
        } else {
          const data = await res.json();
          results.push({ success: false, folderName, error: data.error || "登録に失敗しました" });
        }
      } catch (err) {
        results.push({ success: false, folderName, error: "通信エラー" });
      }
    }

    setImportResults(results);
    setImporting(false);
    // 成功したものを選択から除外
    const successFolders = new Set(results.filter(r => r.success).map(r => r.folderName));
    setSelectedFolders(prev => {
      const next = new Set(prev);
      successFolders.forEach(f => next.delete(f));
      return next;
    });
  };

  // フォルダ名から完成月を抽出
  const extractCompletionMonth = (note: string | null): string => {
    if (!note) return "";
    // "連系2026年3月(目安)" → "2026-03"
    const match = note.match(/連系(\d{4})年(\d{1,2})月/);
    if (match) {
      return `${match[1]}-${String(parseInt(match[2])).padStart(2, "0")}`;
    }
    return "";
  };

  const validFoldersCount = folders.filter(f => f.managementNumber && f.projectNumber).length;
  const successCount = importResults.filter(r => r.success).length;
  const failureCount = importResults.filter(r => !r.success).length;

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <div className="mx-auto max-w-4xl py-6 sm:py-10">
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center gap-4">
            <Link href="/tools">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <Upload className="h-6 w-6" />
                案件一括インポート
              </h1>
              <p className="text-sm text-muted-foreground">
                どこでもキャビネットのフォルダ名から案件を一括登録します
              </p>
            </div>
          </div>

          {/* フォルダ取得ボタン */}
          {!hasFetched && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    どこでもキャビネットからフォルダ一覧を取得します
                  </p>
                  <Button onClick={fetchFolders} disabled={loading}>
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Folder className="h-4 w-4 mr-2" />
                    )}
                    フォルダ一覧を取得
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* エラー表示 */}
          {error && (
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">{error}</p>
                </div>
                <Button variant="outline" className="mt-4" onClick={fetchFolders}>
                  再試行
                </Button>
              </CardContent>
            </Card>
          )}

          {/* インポート結果 */}
          {importResults.length > 0 && (
            <Card className={successCount > 0 && failureCount === 0 ? "border-green-200 dark:border-green-800" : ""}>
              <CardHeader>
                <CardTitle className="text-sm font-medium">インポート結果</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    成功: {successCount}件
                  </Badge>
                  {failureCount > 0 && (
                    <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                      <XCircle className="h-3 w-3 mr-1" />
                      失敗: {failureCount}件
                    </Badge>
                  )}
                </div>
                {failureCount > 0 && (
                  <div className="space-y-2">
                    {importResults.filter(r => !r.success).map((result, index) => (
                      <div key={index} className="text-sm text-red-600 flex items-center gap-2">
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span className="truncate">{result.folderName}</span>
                        <span className="text-xs">- {result.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* フォルダ一覧 */}
          {hasFetched && !error && folders.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">フォルダ一覧</CardTitle>
                    <CardDescription>
                      {validFoldersCount}件のインポート可能なフォルダ（全{folders.length}件中）
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      全選択
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      全解除
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {folders.map((folder, index) => {
                      const isValid = folder.managementNumber && folder.projectNumber;
                      const isSelected = selectedFolders.has(folder.folderName);

                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : isValid
                              ? "hover:bg-muted/50"
                              : "opacity-50"
                          }`}
                          onClick={() => isValid && toggleFolder(folder.folderName)}
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={!isValid}
                            onCheckedChange={() => isValid && toggleFolder(folder.folderName)}
                          />
                          <Folder className={`h-5 w-5 shrink-0 ${isValid ? "text-blue-500" : "text-zinc-400"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{folder.folderName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {folder.managementNumber && (
                                <Badge variant="outline" className="text-xs">
                                  {folder.managementNumber}
                                </Badge>
                              )}
                              {folder.manager && (
                                <Badge variant="secondary" className="text-xs">
                                  {folder.manager}
                                </Badge>
                              )}
                              {folder.projectNumber && (
                                <Badge variant="secondary" className="text-xs">
                                  {folder.projectNumber}
                                </Badge>
                              )}
                              {folder.note && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {folder.note}
                                </span>
                              )}
                            </div>
                          </div>
                          {!isValid && (
                            <Badge variant="destructive" className="text-xs shrink-0">
                              解析不可
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* インポートボタン */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedFolders.size}件を選択中
                  </p>
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={selectedFolders.size === 0 || importing}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        インポート中...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        選択した案件をインポート
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 確認ダイアログ */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>案件をインポートしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              選択された{selectedFolders.size}件の案件をシステムに登録します。
              既に同じ管理番号または案件番号で登録されている場合は、エラーになる可能性があります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>インポート実行</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
