"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Mountain, Layers, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Cesiumの型定義
declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}

interface CesiumTerrainViewerProps {
  center?: [number, number]; // [lat, lon]
  polygon?: [number, number][]; // [[lat, lon], ...]
  elevationMatrix?: (number | null)[][];
  slopeMatrix?: (number | null)[][];
  gridInfo?: {
    originLat: number;
    originLon: number;
    interval: number;
    rows: number;
    cols: number;
  };
}

// 傾斜度に応じた色を返す
function getSlopeColor(slopeDegrees: number): string {
  if (slopeDegrees < 3) return "rgba(34, 197, 94, 0.6)";   // green - 平坦
  if (slopeDegrees < 8) return "rgba(234, 179, 8, 0.6)";   // yellow - 緩やか
  if (slopeDegrees < 15) return "rgba(249, 115, 22, 0.6)"; // orange - やや急
  if (slopeDegrees < 30) return "rgba(239, 68, 68, 0.6)";  // red - 急
  return "rgba(127, 29, 29, 0.6)";                          // darkred - 非常に急
}

// 傾斜分類ラベル
function getSlopeLabel(slopeDegrees: number): string {
  if (slopeDegrees < 3) return "平坦";
  if (slopeDegrees < 8) return "緩やか";
  if (slopeDegrees < 15) return "やや急";
  if (slopeDegrees < 30) return "急";
  return "非常に急";
}

export function CesiumTerrainViewer({
  center,
  polygon,
  elevationMatrix,
  slopeMatrix,
  gridInfo,
}: CesiumTerrainViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLayer, setImageLayer] = useState<"photo" | "std" | "pale">("photo");
  const [showSlopeOverlay, setShowSlopeOverlay] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Cesiumのベースパスを設定
    window.CESIUM_BASE_URL = "/cesium/";

    let viewer: any = null;

    const initCesium = async () => {
      try {
        // Cesiumを動的インポート
        const Cesium = await import("cesium");

        // CSSを読み込み（link要素で追加）
        if (!document.getElementById("cesium-widgets-css")) {
          const link = document.createElement("link");
          link.id = "cesium-widgets-css";
          link.rel = "stylesheet";
          link.href = "/cesium/Widgets/widgets.css";
          document.head.appendChild(link);
        }

        if (!containerRef.current) return;

        // 既存のビューワーを破棄
        if (viewerRef.current) {
          viewerRef.current.destroy();
        }

        // デフォルト中心点（日本）
        const defaultCenter = center || [35.6762, 139.6503];

        // ビューワー作成（Cesium Ion不使用、完全無料構成）
        viewer = new Cesium.Viewer(containerRef.current, {
          // UIオプション
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          selectionIndicator: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          vrButton: false,
          infoBox: false,

          // 地形なし（後で追加可能）
          terrain: undefined,

          // ベースレイヤーなし（カスタムで追加）
          baseLayer: false,
        });

        viewerRef.current = viewer;

        // 国土地理院タイルを追加（無料）
        const gsiImageryProvider = new Cesium.UrlTemplateImageryProvider({
          url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
          maximumLevel: 18,
          credit: new Cesium.Credit("国土地理院"),
        });
        viewer.imageryLayers.addImageryProvider(gsiImageryProvider);

        // カメラを中心点に移動
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            defaultCenter[1], // lon
            defaultCenter[0], // lat
            1500 // 高度
          ),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0,
          },
          duration: 0,
        });

        // ポリゴンがあれば描画
        if (polygon && polygon.length >= 3) {
          const positions = polygon.map(([lat, lon]) =>
            Cesium.Cartesian3.fromDegrees(lon, lat)
          );

          viewer.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(positions),
              material: Cesium.Color.BLUE.withAlpha(0.2),
              outline: true,
              outlineColor: Cesium.Color.BLUE,
              outlineWidth: 3,
            },
          });

          // ポリゴンにズーム
          viewer.zoomTo(viewer.entities);
        }

        // 傾斜オーバーレイを追加（slopeMatrixがある場合）
        if (showSlopeOverlay && slopeMatrix && gridInfo) {
          addSlopeOverlay(viewer, Cesium, slopeMatrix, gridInfo);
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error("Cesium initialization error:", err);
        setError(err.message || "3Dビューワーの初期化に失敗しました");
        setIsLoading(false);
      }
    };

    initCesium();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [center, polygon]);

  // 画像レイヤー変更
  useEffect(() => {
    if (!viewerRef.current) return;

    const viewer = viewerRef.current;
    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    // 既存のレイヤーをクリア
    viewer.imageryLayers.removeAll();

    // 選択されたレイヤーを追加
    const urls: Record<string, string> = {
      photo: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
      std: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
      pale: "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
    };

    const provider = new Cesium.UrlTemplateImageryProvider({
      url: urls[imageLayer],
      maximumLevel: 18,
      credit: new Cesium.Credit("国土地理院"),
    });
    viewer.imageryLayers.addImageryProvider(provider);
  }, [imageLayer]);

  // 傾斜オーバーレイ追加関数
  const addSlopeOverlay = (viewer: any, Cesium: any, slopes: (number | null)[][], info: typeof gridInfo) => {
    if (!info) return;

    const EARTH_RADIUS_M = 6371000;
    const dLat = (info.interval / EARTH_RADIUS_M) * (180 / Math.PI);
    const dLon = (info.interval / (EARTH_RADIUS_M * Math.cos((info.originLat * Math.PI) / 180))) * (180 / Math.PI);

    for (let r = 0; r < slopes.length; r++) {
      for (let c = 0; c < (slopes[r]?.length || 0); c++) {
        const slope = slopes[r][c];
        if (slope === null) continue;

        const lat = info.originLat - r * dLat;
        const lon = info.originLon + c * dLon;

        const color = Cesium.Color.fromCssColorString(getSlopeColor(slope));

        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
          point: {
            pixelSize: 8,
            color: color,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
          },
          description: `傾斜: ${slope.toFixed(1)}° (${getSlopeLabel(slope)})`,
        });
      }
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/50 rounded-lg">
        <div className="text-center p-4">
          <Mountain className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* コントロールパネル */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-md">
        <Select value={imageLayer} onValueChange={(v) => setImageLayer(v as any)}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <Layers className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="photo">航空写真</SelectItem>
            <SelectItem value="std">標準地図</SelectItem>
            <SelectItem value="pale">淡色地図</SelectItem>
          </SelectContent>
        </Select>

        {slopeMatrix && (
          <Button
            variant={showSlopeOverlay ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setShowSlopeOverlay(!showSlopeOverlay)}
          >
            <Eye className="h-3 w-3 mr-1" />
            傾斜
          </Button>
        )}
      </div>

      {/* ローディング */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">3Dビューワーを読み込み中...</p>
          </div>
        </div>
      )}

      {/* Cesiumコンテナ */}
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: "400px" }}
      />

      {/* 凡例 */}
      {showSlopeOverlay && (
        <div className="absolute bottom-2 right-2 z-10 bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-md text-xs">
          <p className="font-medium mb-1">傾斜凡例</p>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgb(34, 197, 94)" }} />
              <span>平坦 (&lt;3°)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgb(234, 179, 8)" }} />
              <span>緩やか (3-8°)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgb(249, 115, 22)" }} />
              <span>やや急 (8-15°)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgb(239, 68, 68)" }} />
              <span>急 (15-30°)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgb(127, 29, 29)" }} />
              <span>非常に急 (&gt;30°)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CesiumTerrainViewer;
