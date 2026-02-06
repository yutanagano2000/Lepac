"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Map,
  Satellite,
  Mountain,
  Save,
  Trash2,
  Type,
  Download,
  Loader2,
  ArrowUpRight,
  MapPin,
  ImagePlus,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import type { TileLayerType } from "./constants";
import { captureMapAsPng, captureMapAsPdf, downloadBlob } from "@/lib/map-export";

interface DrawingToolbarProps {
  activeTile: TileLayerType;
  onTileChange: (type: TileLayerType) => void;
  onClear: () => void;
  onSave?: () => void;
  saving?: boolean;
  name: string;
  onNameChange: (name: string) => void;
  isTextMode: boolean;
  onToggleTextMode: () => void;
  isLeaderMode: boolean;
  onToggleLeaderMode: () => void;
  isSitePinMode: boolean;
  onToggleSitePinMode: () => void;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  projectId?: number;
  // 画像オーバーレイ
  onImageUpload: (dataUrl: string) => void;
  overlayOpacity: number;
  onOpacityChange: (value: number) => void;
  overlayVisible: boolean;
  onToggleOverlay: () => void;
  onRemoveOverlay: () => void;
  hasOverlay: boolean;
}

const TILE_OPTIONS: { type: TileLayerType; label: string; icon: typeof Map }[] = [
  { type: "std", label: "標準", icon: Map },
  { type: "photo", label: "航空写真", icon: Satellite },
  { type: "pale", label: "淡色", icon: Mountain },
];

export function DrawingToolbar({
  activeTile,
  onTileChange,
  onClear,
  onSave,
  saving,
  name,
  onNameChange,
  isTextMode,
  onToggleTextMode,
  isLeaderMode,
  onToggleLeaderMode,
  isSitePinMode,
  onToggleSitePinMode,
  mapContainerRef,
  projectId,
  onImageUpload,
  overlayOpacity,
  onOpacityChange,
  overlayVisible,
  onToggleOverlay,
  onRemoveOverlay,
  hasOverlay,
}: DrawingToolbarProps) {
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onImageUpload(reader.result);
      }
    };
    reader.readAsDataURL(file);
    // リセットして同じファイルも再選択可能に
    e.target.value = "";
  };

  const handleExportPng = async () => {
    if (!mapContainerRef.current) return;
    setExporting(true);
    try {
      const blob = await captureMapAsPng(mapContainerRef.current);
      if (blob) {
        downloadBlob(blob, `${name || "案内図"}.png`);
      }
    } catch (e) {
      console.error("PNG export failed:", e);
      alert("PNG出力に失敗しました");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!mapContainerRef.current) return;
    setExporting(true);
    try {
      const blob = await captureMapAsPdf(mapContainerRef.current, name || "現場案内図");
      if (blob) {
        downloadBlob(blob, `${name || "案内図"}.pdf`);
      }
    } catch (e) {
      console.error("PDF export failed:", e);
      alert("PDF出力に失敗しました");
    } finally {
      setExporting(false);
    }
  };

  const handleSaveToProject = async () => {
    if (!mapContainerRef.current || !projectId) return;
    setExporting(true);
    try {
      const blob = await captureMapAsPng(mapContainerRef.current);
      if (!blob) return;

      const formData = new FormData();
      formData.append("file", new File([blob], `${name || "案内図"}.png`, { type: "image/png" }));
      formData.append("projectId", String(projectId));
      formData.append("category", "drawing");

      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        alert("案件ファイルに保存しました（図面カテゴリ）");
      } else {
        const data = await res.json();
        alert(`保存失敗: ${data.error || "不明なエラー"}`);
      }
    } catch (e) {
      console.error("Save to project failed:", e);
      alert("案件ファイルへの保存に失敗しました");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
      {/* 案内図名入力 */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-2">
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="案内図名"
          className="h-8 text-sm w-48"
        />
      </div>

      {/* タイルレイヤー切替 */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-1 flex gap-1">
        {TILE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <Button
              key={opt.type}
              variant={activeTile === opt.type ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => onTileChange(opt.type)}
              title={opt.label}
            >
              <Icon className="h-3.5 w-3.5 mr-1" />
              {opt.label}
            </Button>
          );
        })}
      </div>

      {/* 画像オーバーレイ */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-1 flex flex-col gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs w-full"
          onClick={() => fileInputRef.current?.click()}
          title="画像を重ねる"
        >
          <ImagePlus className="h-3.5 w-3.5 mr-1" />
          画像を重ねる
        </Button>
        {hasOverlay && (
          <>
            <div className="flex items-center gap-1">
              <Button
                variant={overlayVisible ? "default" : "ghost"}
                size="sm"
                className="h-7 px-1.5"
                onClick={onToggleOverlay}
                title={overlayVisible ? "非表示" : "表示"}
              >
                {overlayVisible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 text-destructive hover:text-destructive"
                onClick={onRemoveOverlay}
                title="画像削除"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="px-1 pb-1">
              <label className="text-[10px] text-muted-foreground">
                透過度: {Math.round(overlayOpacity * 100)}%
              </label>
              <Slider
                value={[overlayOpacity * 100]}
                onValueChange={(v) => onOpacityChange(v[0] / 100)}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </>
        )}
      </div>

      {/* テキストモード */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-1">
        <Button
          variant={isTextMode ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs w-full"
          onClick={onToggleTextMode}
          title="テキストラベル追加"
        >
          <Type className="h-3.5 w-3.5 mr-1" />
          テキスト{isTextMode ? "モード ON" : ""}
        </Button>
      </div>

      {/* 引き出し線モード */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-1">
        <Button
          variant={isLeaderMode ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs w-full"
          onClick={onToggleLeaderMode}
          title="引き出し線（目印→住所ボックス）"
        >
          <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
          引き出し線{isLeaderMode ? "モード ON" : ""}
        </Button>
      </div>

      {/* 現場ピンモード */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-1">
        <Button
          variant={isSitePinMode ? "default" : "ghost"}
          size="sm"
          className="h-8 px-2 text-xs w-full"
          onClick={onToggleSitePinMode}
          title="現場ピンを配置"
        >
          <MapPin className="h-3.5 w-3.5 mr-1" />
          現場ピン{isSitePinMode ? "モード ON" : ""}
        </Button>
      </div>

      {/* エクスポート */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-1 flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={handleExportPng}
          disabled={exporting}
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
          PNG
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={handleExportPdf}
          disabled={exporting}
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
          PDF
        </Button>
        {projectId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={handleSaveToProject}
            disabled={exporting}
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            案件に保存
          </Button>
        )}
      </div>

      {/* 保存/削除 */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-1 flex flex-col gap-1">
        {onSave && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            保存
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-destructive hover:text-destructive"
          onClick={onClear}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          全削除
        </Button>
      </div>
    </div>
  );
}
