"use client";

import {
  Folder,
  Upload,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useImportData, useImportActions } from "./_hooks";
import {
  ImportResultCard,
  FolderListCard,
  ImportConfirmDialog,
} from "./_components";

export default function ImportPage() {
  const { folders, loading, error, hasFetched, fetchFolders, validFoldersCount } =
    useImportData();

  const {
    selectedFolders,
    importing,
    importResults,
    showConfirmDialog,
    setShowConfirmDialog,
    toggleFolder,
    selectAll,
    clearSelection,
    handleImport,
    successCount,
    failureCount,
  } = useImportActions({ folders });

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
          <ImportResultCard
            importResults={importResults}
            successCount={successCount}
            failureCount={failureCount}
          />

          {/* フォルダ一覧 */}
          {hasFetched && !error && folders.length > 0 && (
            <FolderListCard
              folders={folders}
              selectedFolders={selectedFolders}
              validFoldersCount={validFoldersCount}
              importing={importing}
              onToggleFolder={toggleFolder}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              onShowConfirmDialog={() => setShowConfirmDialog(true)}
            />
          )}
        </div>
      </div>

      {/* 確認ダイアログ */}
      <ImportConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        selectedCount={selectedFolders.size}
        onConfirm={handleImport}
      />
    </div>
  );
}
