"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Upload, File, Image as ImageIcon, FileText, Trash2, Download, Eye, FolderOpen } from "lucide-react";
import { PDFThumbnail } from "@/components/PDFThumbnail";
import { uploadFile } from "@/app/actions/uploadFile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ProjectFile } from "@/db/schema";

// ファイルカテゴリの定義
const FILE_CATEGORIES = {
  registry_copy: { label: "謄本", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  cadastral_map: { label: "公図", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  drawing: { label: "図面", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  consent_form: { label: "同意書", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  other: { label: "その他", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
} as const;

type FileCategory = keyof typeof FILE_CATEGORIES;

interface ProjectFilesProps {
  projectId: number;
  initialFiles?: ProjectFile[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) {
    return <ImageIcon className="h-5 w-5" />;
  }
  if (fileType === "application/pdf") {
    return <FileText className="h-5 w-5" />;
  }
  return <File className="h-5 w-5" />;
}

export function ProjectFiles({ projectId, initialFiles = [] }: ProjectFilesProps) {
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [deleteFile, setDeleteFile] = useState<ProjectFile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>("other");
  const [activeTab, setActiveTab] = useState<string>("all");

  // カテゴリ別にファイルをグループ化
  const filesByCategory = useMemo(() => {
    const grouped: Record<string, ProjectFile[]> = { all: files };
    Object.keys(FILE_CATEGORIES).forEach((cat) => {
      grouped[cat] = files.filter((f) => (f.category || "other") === cat);
    });
    return grouped;
  }, [files]);

  const fetchFiles = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/files`);
    if (res.ok) {
      const json = await res.json();
      // APIがpaginatedレスポンス {data, pagination} を返す場合に対応
      const filesData = Array.isArray(json) ? json : (json.data ?? []);
      setFiles(filesData);
    }
  }, [projectId]);

  // マウント時にファイル一覧を取得
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // デバッグ用ログ
  useEffect(() => {
    console.log("ProjectFiles - files:", files);
    console.log("ProjectFiles - projectId:", projectId);
  }, [files, projectId]);

  const handleUpload = async (fileList: FileList | null, category?: FileCategory) => {
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    const uploadCategory = category || selectedCategory;

    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", String(projectId));
      formData.append("category", uploadCategory);

      try {
        const result = await uploadFile(formData);

        if (result.error) {
          console.error("Server error:", result.error);
          toast.error(`アップロード失敗: ${result.error}`);
        }
      } catch (err) {
        console.error("Upload error:", err);
        toast.error(`アップロードに失敗しました: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    await fetchFiles();
    setIsUploading(false);
  };

  const handleDelete = async () => {
    if (!deleteFile) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/files/${deleteFile.id}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        await fetchFiles();
      } else {
        toast.error("削除に失敗しました");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("削除に失敗しました");
    }

    setDeleteFile(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  // ファイルカードのレンダリング
  const renderFileCard = (file: ProjectFile) => {
    const category = (file.category || "other") as FileCategory;
    const categoryInfo = FILE_CATEGORIES[category];

    return (
      <Card key={file.id} className="overflow-hidden">
        <CardContent className="p-0">
          {/* プレビューサムネイル */}
          {file.fileType.startsWith("image/") ? (
            <button
              onClick={() => setPreviewFile(file)}
              className="w-full aspect-video bg-muted flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity"
            >
              <img
                src={`/api/projects/${projectId}/files/${file.id}/preview`}
                alt={file.fileName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </button>
          ) : file.fileType === "application/pdf" ? (
            <PDFThumbnail
              src={`/api/projects/${projectId}/files/${file.id}/preview`}
              alt={file.fileName}
              className="w-full aspect-video hover:opacity-80 transition-opacity"
              onClick={() => setPreviewFile(file)}
            />
          ) : (
            <button
              onClick={() => setPreviewFile(file)}
              className="w-full aspect-video bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <FileText className="h-12 w-12 text-muted-foreground" />
            </button>
          )}

          {/* ファイル情報 */}
          <div className="p-3">
            <div className="flex items-start gap-2">
              <div className="shrink-0 text-muted-foreground">
                {getFileIcon(file.fileType)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" title={file.fileName}>
                  {file.fileName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", categoryInfo.color)}>
                    {categoryInfo.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 flex-1"
                onClick={() => setPreviewFile(file)}
              >
                <Eye className="h-3 w-3 mr-1" />
                表示
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 flex-1"
                asChild
              >
                <a href={`/api/projects/${projectId}/files/${file.id}/download`} target="_blank" rel="noopener noreferrer">
                  <Download className="h-3 w-3 mr-1" />
                  保存
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteFile(file)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* アップロードエリア */}
      <div className="space-y-3">
        {/* カテゴリ選択 */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">カテゴリ:</label>
          <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as FileCategory)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FILE_CATEGORIES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50",
            isUploading && "opacity-50 pointer-events-none"
          )}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isUploading
                ? "アップロード中..."
                : "ファイルをドラッグ&ドロップ、またはクリックして選択"}
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, GIF, WebP, PDF（最大10MB）
            </p>
            <p className="text-xs font-medium text-primary">
              カテゴリ: {FILE_CATEGORIES[selectedCategory].label}
            </p>
          </label>
        </div>
      </div>

      {/* ファイル一覧（カテゴリ別タブ） */}
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          ファイルがありません
        </p>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          // タブ切り替え時にカテゴリプルダウンも連動（「すべて」の場合は「その他」に設定）
          if (value !== "all" && value in FILE_CATEGORIES) {
            setSelectedCategory(value as FileCategory);
          }
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-4">
            <TabsTrigger value="all" className="text-xs">
              すべて ({files.length})
            </TabsTrigger>
            {Object.entries(FILE_CATEGORIES).map(([key, { label }]) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {label} ({filesByCategory[key]?.length || 0})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {files.map(renderFileCard)}
            </div>
          </TabsContent>

          {Object.keys(FILE_CATEGORIES).map((key) => (
            <TabsContent key={key} value={key}>
              {filesByCategory[key]?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mb-2" />
                  <p className="text-sm">{FILE_CATEGORIES[key as FileCategory].label}のファイルがありません</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filesByCategory[key]?.map(renderFileCard)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* プレビューダイアログ */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="!max-w-[95vw] w-[95vw] max-h-[95vh] overflow-hidden p-4 sm:!max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {previewFile?.fileName}
            </DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="mt-2 overflow-hidden">
              {previewFile.fileType.startsWith("image/") ? (
                <div className="flex items-center justify-center max-h-[calc(95vh-100px)] overflow-auto">
                  <img
                    src={`/api/projects/${projectId}/files/${previewFile.id}/preview`}
                    alt={previewFile.fileName}
                    className="max-w-full max-h-[calc(95vh-100px)] object-contain rounded-lg"
                  />
                </div>
              ) : previewFile.fileType === "application/pdf" ? (
                <div className="space-y-3">
                  <iframe
                    src={`/api/projects/${projectId}/files/${previewFile.id}/preview`}
                    className="w-full h-[calc(95vh-120px)] rounded-lg border"
                    title={previewFile.fileName}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`/api/projects/${projectId}/files/${previewFile.id}/preview`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        新しいタブで開く
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`/api/projects/${projectId}/files/${previewFile.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        ダウンロード
                      </a>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ファイルを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteFile?.fileName}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
