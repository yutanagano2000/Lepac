"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen,
  Folder,
  FileText,
  ChevronDown,
  ChevronRight,
  Copy,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FileInfo {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
}

interface Subfolder {
  key: string;
  name: string;
  label: string;
  path: string;
  exists: boolean;
  fileCount: number;
  files: string[];
}

interface FolderInfo {
  found: boolean;
  managementNumber: string;
  folderPath?: string;
  folderName?: string;
  subfolders?: Subfolder[];
  message?: string;
}

interface ProjectFolderLinkProps {
  managementNumber: string | null;
}

export function ProjectFolderLink({ managementNumber }: ProjectFolderLinkProps) {
  const [folderInfo, setFolderInfo] = useState<FolderInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSubfolders, setExpandedSubfolders] = useState<Set<string>>(new Set());
  const [subfolderFiles, setSubfolderFiles] = useState<Record<string, FileInfo[]>>({});
  const [loadingSubfolder, setLoadingSubfolder] = useState<string | null>(null);

  const fetchFolderInfo = async () => {
    if (!managementNumber) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/filesystem?action=findFolder&managementNumber=${encodeURIComponent(managementNumber)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "フォルダ情報の取得に失敗しました");
        return;
      }

      setFolderInfo(data);
    } catch (err) {
      setError("ファイルサーバーに接続できません");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (managementNumber) {
      fetchFolderInfo();
    }
  }, [managementNumber]);

  const fetchSubfolderFiles = async (subfolderKey: string) => {
    if (!managementNumber) return;

    setLoadingSubfolder(subfolderKey);

    try {
      const res = await fetch(`/api/filesystem?action=listFiles&managementNumber=${encodeURIComponent(managementNumber)}&subfolder=${subfolderKey}`);
      const data = await res.json();

      if (res.ok) {
        setSubfolderFiles(prev => ({ ...prev, [subfolderKey]: data.files }));
      }
    } catch (err) {
      console.error("ファイル一覧の取得に失敗:", err);
    } finally {
      setLoadingSubfolder(null);
    }
  };

  const toggleSubfolder = async (subfolderKey: string) => {
    const isExpanded = expandedSubfolders.has(subfolderKey);

    if (isExpanded) {
      setExpandedSubfolders(prev => {
        const next = new Set(prev);
        next.delete(subfolderKey);
        return next;
      });
    } else {
      setExpandedSubfolders(prev => new Set(prev).add(subfolderKey));
      if (!subfolderFiles[subfolderKey]) {
        await fetchSubfolderFiles(subfolderKey);
      }
    }
  };

  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const copyPath = async (folderPath: string) => {
    try {
      await navigator.clipboard.writeText(folderPath);
      setCopySuccess(folderPath);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split(".").pop();
    const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
    const excelExts = ["xlsx", "xls", "csv"];
    const wordExts = ["doc", "docx"];
    const pdfExts = ["pdf"];

    if (imageExts.includes(ext || "")) return <ImageIcon className="h-4 w-4 text-green-500" />;
    if (excelExts.includes(ext || "")) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    if (wordExts.includes(ext || "")) return <FileText className="h-4 w-4 text-blue-600" />;
    if (pdfExts.includes(ext || "")) return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4 text-zinc-500" />;
  };

  // ファイルのフルパスを取得
  const getFilePath = (file: FileInfo, subfolderPath: string) => {
    // subfolderPathとファイルのpathを結合
    return `${subfolderPath}\\${file.path.replace(/\//g, "\\")}`;
  };

  // エクスプローラーでフォルダを開く
  const openInExplorer = async (folderPath: string) => {
    try {
      const res = await fetch("/api/filesystem/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: folderPath }),
      });
      if (!res.ok) {
        console.error("エクスプローラーを開けませんでした");
      }
    } catch (err) {
      console.error("エクスプローラーを開けませんでした:", err);
    }
  };

  if (!managementNumber) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Folder className="h-4 w-4" />
            フォルダ連携
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">管理番号が設定されていません</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Folder className="h-4 w-4" />
            フォルダ連携
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            検索中...
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
            <Folder className="h-4 w-4" />
            フォルダ連携
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={fetchFolderInfo}>
            <RefreshCw className="h-3 w-3 mr-1" />
            再試行
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!folderInfo?.found) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Folder className="h-4 w-4" />
            フォルダ連携
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4 text-zinc-400" />
            {folderInfo?.message || "フォルダが見つかりません"}
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = folderInfo.subfolders?.filter(sf => sf.fileCount > 0).length || 0;
  const totalCount = folderInfo.subfolders?.length || 0;

  return (
    <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-blue-500" />
              フォルダ連携
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {completedCount}/{totalCount} 登録済
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* メインフォルダ */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <Folder className="h-5 w-5 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{folderInfo.folderName}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 gap-1",
                  copySuccess === folderInfo.folderPath && "text-green-600"
                )}
                onClick={() => folderInfo.folderPath && copyPath(folderInfo.folderPath)}
                title="パスをコピー"
              >
                {copySuccess === folderInfo.folderPath ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-xs">コピー済</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span className="text-xs">コピー</span>
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1"
                onClick={() => folderInfo.folderPath && openInExplorer(folderInfo.folderPath)}
                title="フォルダを開く"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="text-xs">開く</span>
              </Button>
            </div>
          </div>

          {/* サブフォルダ一覧 */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                <span className="text-xs">サブフォルダ一覧</span>
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 mt-2">
                {folderInfo.subfolders?.map((sf) => {
                  const isExpanded = expandedSubfolders.has(sf.key);
                  const files = subfolderFiles[sf.key] || [];
                  const isLoadingFiles = loadingSubfolder === sf.key;

                  return (
                    <div key={sf.key} className="space-y-1">
                      <div
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md text-sm cursor-pointer transition-colors",
                          sf.fileCount > 0
                            ? "bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30"
                            : "bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                        )}
                        onClick={() => sf.exists && sf.fileCount > 0 && toggleSubfolder(sf.key)}
                      >
                        {sf.fileCount > 0 ? (
                          isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-green-500 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-green-500 shrink-0" />
                          )
                        ) : (
                          <XCircle className="h-4 w-4 text-zinc-400 shrink-0" />
                        )}
                        <span className="flex-1 truncate">{sf.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {sf.fileCount}件
                        </Badge>
                        {sf.exists && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-6 px-1",
                                copySuccess === sf.path && "text-green-600"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                copyPath(sf.path);
                              }}
                              title="パスをコピー"
                              aria-label="パスをコピー"
                            >
                              {copySuccess === sf.path ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                openInExplorer(sf.path);
                              }}
                              title="フォルダを開く"
                              aria-label="フォルダを開く"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* ファイル一覧 */}
                      {isExpanded && (
                        <div className="ml-4 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-1">
                          {isLoadingFiles ? (
                            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              読み込み中...
                            </div>
                          ) : files.length > 0 ? (
                            files.map((file, idx) => {
                              const filePath = getFilePath(file, sf.path);
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 p-1.5 rounded text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 group"
                                >
                                  {getFileIcon(file.name)}
                                  <span className="flex-1 truncate" title={file.name}>
                                    {file.name}
                                  </span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "h-5 px-1",
                                        copySuccess === filePath && "text-green-600"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyPath(filePath);
                                      }}
                                      title="パスをコピー"
                                      aria-label="パスをコピー"
                                    >
                                      {copySuccess === filePath ? (
                                        <CheckCircle2 className="h-3 w-3" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 px-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openInExplorer(sf.path);
                                      }}
                                      title="フォルダを開く"
                                      aria-label="フォルダを開く"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-muted-foreground py-2">ファイルがありません</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
  );
}
