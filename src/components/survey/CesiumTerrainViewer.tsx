"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  if (slopeDegrees < 3) return "rgba(34, 197, 94, 0.6)";
  if (slopeDegrees < 8) return "rgba(234, 179, 8, 0.6)";
  if (slopeDegrees < 15) return "rgba(249, 115, 22, 0.6)";
  if (slopeDegrees < 30) return "rgba(239, 68, 68, 0.6)";
  return "rgba(127, 29, 29, 0.6)";
}

// 傾斜分類ラベル
function getSlopeLabel(slopeDegrees: number): string {
  if (slopeDegrees < 3) return "平坦";
  if (slopeDegrees < 8) return "緩やか";
  if (slopeDegrees < 15) return "やや急";
  if (slopeDegrees < 30) return "急";
  return "非常に急";
}

const VERTEX_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type CesiumModule = typeof import("cesium");

export function CesiumTerrainViewer({
  center,
  polygon,
  slopeMatrix,
  gridInfo,
}: CesiumTerrainViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<InstanceType<CesiumModule["Viewer"]> | null>(null);
  const cesiumRef = useRef<CesiumModule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLayer, setImageLayer] = useState<"photo" | "std" | "pale">("photo");
  const [showSlopeOverlay, setShowSlopeOverlay] = useState(false);

  // 傾斜オーバーレイ追加関数
  const addSlopeOverlay = useCallback((
    viewer: InstanceType<CesiumModule["Viewer"]>,
    Cesium: CesiumModule,
    slopes: (number | null)[][],
    info: NonNullable<typeof gridInfo>
  ) => {
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
          position: Cesium.Cartesian3.fromDegrees(lon, lat),
          point: {
            pixelSize: 8,
            color: color,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          description: `傾斜: ${slope.toFixed(1)}° (${getSlopeLabel(slope)})`,
        });
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.CESIUM_BASE_URL = "/cesium/";

    const initCesium = async () => {
      try {
        const Cesium = await import("cesium");
        cesiumRef.current = Cesium;

        // Cesium Ion トークン設定
        const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
        if (token) {
          Cesium.Ion.defaultAccessToken = token;
        }

        if (!document.getElementById("cesium-widgets-css")) {
          const link = document.createElement("link");
          link.id = "cesium-widgets-css";
          link.rel = "stylesheet";
          link.href = "/cesium/Widgets/widgets.css";
          document.head.appendChild(link);
        }

        if (!containerRef.current) return;

        if (viewerRef.current) {
          viewerRef.current.destroy();
        }

        const defaultCenter = center || [35.6762, 139.6503];

        // GSI航空写真をbaseLayerとして直接設定（Ion不要で確実に表示）
        const gsiBaseLayer = new Cesium.ImageryLayer(
          new Cesium.UrlTemplateImageryProvider({
            url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
            maximumLevel: 18,
            credit: new Cesium.Credit("国土地理院"),
          })
        );

        const viewer = new Cesium.Viewer(containerRef.current, {
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
          baseLayer: gsiBaseLayer,
        });

        viewerRef.current = viewer;

        // Cesium World Terrain を非同期追加（失敗しても画像は表示される）
        try {
          viewer.scene.setTerrain(
            Cesium.Terrain.fromWorldTerrain({
              requestVertexNormals: true,
              requestWaterMask: true,
            })
          );
        } catch (terrainErr) {
          console.warn("World Terrain load failed:", terrainErr);
        }

        // ライティング無効化（夜間でも明るく表示）
        viewer.scene.globe.enableLighting = false;
        viewer.scene.globe.depthTestAgainstTerrain = true;

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            defaultCenter[1],
            defaultCenter[0],
            800
          ),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-35),
            roll: 0,
          },
          duration: 0,
        });

        if (polygon && polygon.length >= 3) {
          const positions = polygon.map(([lat, lon]) =>
            Cesium.Cartesian3.fromDegrees(lon, lat)
          );

          // ポリゴンを地形にドレープ（clampToGround）
          viewer.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(positions),
              material: Cesium.Color.BLUE.withAlpha(0.15),
              classificationType: Cesium.ClassificationType.TERRAIN,
            },
          });

          // ポリゴン輪郭線（地形に沿って描画）
          viewer.entities.add({
            polyline: {
              positions: [...positions, positions[0]],
              width: 3,
              material: Cesium.Color.BLUE,
              clampToGround: true,
            },
          });

          // 頂点ラベル(A, B, C, D...)を地形上に配置
          polygon.forEach(([lat, lon], i) => {
            if (i >= VERTEX_LABELS.length) return;
            const label = VERTEX_LABELS[i];
            viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(lon, lat),
              label: {
                text: label,
                font: "bold 18px sans-serif",
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.fromCssColorString("#1d4ed8"),
                outlineWidth: 4,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -12),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              },
              point: {
                pixelSize: 12,
                color: Cesium.Color.fromCssColorString("#1d4ed8"),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              },
            });
          });

          viewer.zoomTo(viewer.entities);
        }

        if (showSlopeOverlay && slopeMatrix && gridInfo) {
          addSlopeOverlay(viewer, Cesium, slopeMatrix, gridInfo);
        }

        // キャンバスサイズを正しく更新
        viewer.resize();

        setIsLoading(false);
      } catch (err: unknown) {
        console.error("Cesium initialization error:", err);
        setError(err instanceof Error ? err.message : "3Dビューワーの初期化に失敗しました");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, polygon]);

  // 画像レイヤー変更
  const imageLayerRef = useRef(imageLayer);
  useEffect(() => {
    // 初回マウント時はスキップ（initCesium内で設定済み）
    if (imageLayerRef.current === imageLayer && viewerRef.current) {
      imageLayerRef.current = imageLayer;
      return;
    }
    imageLayerRef.current = imageLayer;

    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium) return;

    const urls: Record<string, string> = {
      photo: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
      std: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
      pale: "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
    };

    viewer.imageryLayers.removeAll();
    const newLayer = new Cesium.ImageryLayer(
      new Cesium.UrlTemplateImageryProvider({
        url: urls[imageLayer],
        maximumLevel: 18,
        credit: new Cesium.Credit("国土地理院"),
      })
    );
    viewer.imageryLayers.add(newLayer);
  }, [imageLayer]);

  // 傾斜オーバーレイのトグル
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium) return;

    if (showSlopeOverlay && slopeMatrix && gridInfo) {
      addSlopeOverlay(viewer, Cesium, slopeMatrix, gridInfo);
    }
  }, [showSlopeOverlay, slopeMatrix, gridInfo, addSlopeOverlay]);

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
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-md">
        <Select value={imageLayer} onValueChange={(v) => setImageLayer(v as "photo" | "std" | "pale")}>
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

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">3Dビューワーを読み込み中...</p>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: "400px" }}
      />

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
