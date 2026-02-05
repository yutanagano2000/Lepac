"use client";

import { useState, useEffect } from "react";
import { Image as ImageIcon, RefreshCw, AlertCircle, ExternalLink, ChevronLeft, ChevronRight, Folder, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface Photo {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
}

interface ProjectPhotoGalleryProps {
  projectNumber: string | null;
}

export function ProjectPhotoGallery({ projectNumber }: ProjectPhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

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

      setPhotos(data.photos);
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

  const openFolder = () => {
    if (!folderPath) return;
    const fileUrl = `file:///${folderPath.replace(/\\/g, "/")}`;
    window.open(fileUrl, "_blank");
  };

  const getPreviewUrl = (photo: Photo) => {
    if (!projectNumber) return "";
    return `/api/filesystem/preview?projectNumber=${encodeURIComponent(projectNumber)}&subfolder=photos&path=${encodeURIComponent(photo.path)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handlePrevious = () => {
    if (selectedIndex === null) return;
    setImageLoading(true);
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : photos.length - 1);
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setImageLoading(true);
    setSelectedIndex(selectedIndex < photos.length - 1 ? selectedIndex + 1 : 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrevious();
    if (e.key === "ArrowRight") handleNext();
    if (e.key === "Escape") setSelectedIndex(null);
  };

  if (!projectNumber) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            現場写真
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            読み込み中...
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
            <ImageIcon className="h-4 w-4" />
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

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              現場写真
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {photos.length}枚
              </Badge>
              {folderPath && (
                <Button variant="ghost" size="sm" className="h-7" onClick={openFolder}>
                  <Folder className="h-3 w-3 mr-1" />
                  フォルダ
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              写真がありません
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {photos.slice(0, 10).map((photo, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setImageLoading(true);
                    setSelectedIndex(index);
                  }}
                  className="aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors relative group bg-muted"
                >
                  {/* サムネイル画像 */}
                  <img
                    src={getPreviewUrl(photo)}
                    alt={photo.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // 画像読み込みエラー時はプレースホルダーを表示
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  {/* ホバー時のオーバーレイ */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink className="h-5 w-5 text-white" />
                  </div>
                  {/* ファイル名（下部） */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                    <p className="text-[10px] text-white truncate">{photo.name}</p>
                  </div>
                </button>
              ))}
              {photos.length > 10 && (
                <button
                  onClick={openFolder}
                  className="aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors bg-muted flex items-center justify-center"
                >
                  <div className="text-center">
                    <p className="text-lg font-bold text-muted-foreground">+{photos.length - 10}</p>
                    <p className="text-xs text-muted-foreground">more</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ライトボックス */}
      <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && setSelectedIndex(null)}>
        <DialogContent
          className="max-w-4xl p-0 overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          <VisuallyHidden>
            <DialogTitle>
              {selectedIndex !== null && photos[selectedIndex] ? photos[selectedIndex].name : "写真プレビュー"}
            </DialogTitle>
          </VisuallyHidden>
          {selectedIndex !== null && photos[selectedIndex] && (
            <div className="relative">
              {/* 画像表示エリア */}
              <div className="aspect-video bg-black flex items-center justify-center relative">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
                <img
                  src={getPreviewUrl(photos[selectedIndex])}
                  alt={photos[selectedIndex].name}
                  className="max-w-full max-h-full object-contain"
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
              </div>

              {/* 画像情報 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-white font-medium truncate">{photos[selectedIndex].name}</p>
                <p className="text-white/70 text-sm">{formatDate(photos[selectedIndex].modifiedAt)}</p>
              </div>

              {/* ナビゲーション */}
              {photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}

              {/* カウンター */}
              <div className="absolute top-4 right-4 bg-black/70 rounded-full px-3 py-1 text-white text-sm">
                {selectedIndex + 1} / {photos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
