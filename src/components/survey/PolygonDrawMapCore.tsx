"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import type { DrawMode } from "./PolygonToolbar";

// Leaflet default icon fix for Next.js/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const PHOTO_TILE_URL = "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg";

const ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>';

interface PolygonDrawMapCoreProps {
  onPolygonReady: (coords: [number, number][]) => void;
  onCrossSectionLine?: (coords: [number, number][]) => void;
  slopeOverlay?: {
    originLat: number;
    originLon: number;
    interval: number;
    slopeMatrix: (number | null)[][];
  };
  flyTo?: [number, number] | null;
  analyzed?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
  drawMode?: DrawMode;
  onDrawModeChange?: (mode: DrawMode) => void;
  resetTrigger?: number;
  crossSectionLineDisplay?: [number, number][] | null;
}

export default function PolygonDrawMapCore({
  onPolygonReady,
  onCrossSectionLine,
  slopeOverlay,
  flyTo,
  analyzed = false,
  initialCenter = [36.0, 138.0],
  initialZoom = 5,
  drawMode = null,
  onDrawModeChange,
  resetTrigger = 0,
  crossSectionLineDisplay = null,
}: PolygonDrawMapCoreProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const overlayGroupRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const labelGroupRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const crossSectionLayerRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const drawHandlerRef = useRef<any>(null);
  const [hasPolygon, setHasPolygon] = useState(false);
  const [hasCrossSection, setHasCrossSection] = useState(false);

  const onPolygonReadyRef = useRef(onPolygonReady);
  const onCrossSectionLineRef = useRef(onCrossSectionLine);
  useEffect(() => { onPolygonReadyRef.current = onPolygonReady; }, [onPolygonReady]);
  useEffect(() => { onCrossSectionLineRef.current = onCrossSectionLine; }, [onCrossSectionLine]);

  const addVertexLabels = useCallback((latlngs: L.LatLng[]) => {
    labelGroupRef.current.clearLayers();
    latlngs.forEach((ll, i) => {
      if (i >= VERTEX_LABELS.length) return;
      const label = VERTEX_LABELS[i];
      L.marker([ll.lat, ll.lng], {
        icon: L.divIcon({
          className: "vertex-label-icon",
          html: `<div style="width:24px;height:24px;background:#1d4ed8;color:#fff;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${label}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
        interactive: false,
      }).addTo(labelGroupRef.current);
    });
  }, []);

  // 初期化
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false, // +/-ボタンを非表示（ホイールとピンチで操作）
    });

    L.tileLayer(PHOTO_TILE_URL, {
      attribution: ATTRIBUTION,
      maxZoom: 18,
    }).addTo(map);

    featureGroupRef.current.addTo(map);
    overlayGroupRef.current.addTo(map);
    labelGroupRef.current.addTo(map);
    crossSectionLayerRef.current.addTo(map);

    // Draw control (非表示 — プログラマティック制御のみ)
    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polygon: {
          shapeOptions: { color: "#3b82f6", weight: 2, fillOpacity: 0.15 },
          allowIntersection: false,
        },
        polyline: {
          shapeOptions: { color: "#f59e0b", weight: 3 },
        },
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup: featureGroupRef.current,
        remove: true,
      },
    });
    drawControl.addTo(map);

    // Leaflet Drawのツールバーを非表示にする
    const drawToolbar = mapContainerRef.current.querySelector(".leaflet-draw") as HTMLElement;
    if (drawToolbar) {
      drawToolbar.style.display = "none";
    }

    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      featureGroupRef.current.addLayer(layer);

      if (e.layerType === "polygon") {
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        const coords: [number, number][] = latlngs.map((ll: L.LatLng) => [
          ll.lng,
          ll.lat,
        ]);
        coords.push(coords[0]);
        setHasPolygon(true);
        addVertexLabels(latlngs);
        onPolygonReadyRef.current(coords);
      } else if (e.layerType === "polyline" && onCrossSectionLineRef.current) {
        const latlngs = layer.getLatLngs() as L.LatLng[];
        const coords: [number, number][] = latlngs.map((ll: L.LatLng) => [
          ll.lng,
          ll.lat,
        ]);
        setHasCrossSection(true);
        onCrossSectionLineRef.current(coords);
      }

      // 描画完了後にモードをリセット
      onDrawModeChange?.(null);
    });

    map.on(L.Draw.Event.DELETED, () => {
      let polygonExists = false;
      let lineExists = false;
      featureGroupRef.current.eachLayer((layer) => {
        if (layer instanceof L.Polygon) polygonExists = true;
        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) lineExists = true;
      });
      setHasPolygon(polygonExists);
      setHasCrossSection(lineExists);
      if (!polygonExists) {
        labelGroupRef.current.clearLayers();
        onPolygonReadyRef.current([]);
      }
    });

    // 編集/削除完了時もモードリセット
    map.on("draw:editstop", () => onDrawModeChange?.(null));
    map.on("draw:deletestop", () => onDrawModeChange?.(null));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // drawMode変更時にプログラマティックに描画モードを制御
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 現在のハンドラを無効化
    if (drawHandlerRef.current) {
      try { drawHandlerRef.current.disable(); } catch { /* ignore */ }
      drawHandlerRef.current = null;
    }

    if (!drawMode) return;

    switch (drawMode) {
      case "polygon":
        drawHandlerRef.current = new (L.Draw as any).Polygon(map, {
          shapeOptions: { color: "#3b82f6", weight: 2, fillOpacity: 0.15 },
          allowIntersection: false,
        });
        drawHandlerRef.current.enable();
        break;
      case "polyline":
        drawHandlerRef.current = new (L.Draw as any).Polyline(map, {
          shapeOptions: { color: "#f59e0b", weight: 3 },
        });
        drawHandlerRef.current.enable();
        break;
      case "edit": {
        const EditHandler = (L as any).EditToolbar?.Edit;
        if (EditHandler) {
          drawHandlerRef.current = new EditHandler(map, {
            featureGroup: featureGroupRef.current,
          });
          drawHandlerRef.current.enable();
        }
        break;
      }
      case "delete": {
        const DeleteHandler = (L as any).EditToolbar?.Delete;
        if (DeleteHandler) {
          drawHandlerRef.current = new DeleteHandler(map, {
            featureGroup: featureGroupRef.current,
          });
          drawHandlerRef.current.enable();
        }
        break;
      }
    }
  }, [drawMode]);

  // flyTo
  useEffect(() => {
    if (!mapRef.current || !flyTo) return;
    mapRef.current.flyTo(flyTo, 17, { duration: 1.2 });
  }, [flyTo]);

  // リセット機能
  useEffect(() => {
    if (resetTrigger === 0) return;
    featureGroupRef.current.clearLayers();
    overlayGroupRef.current.clearLayers();
    labelGroupRef.current.clearLayers();
    setHasPolygon(false);
    setHasCrossSection(false);
    if (drawHandlerRef.current) {
      try { drawHandlerRef.current.disable(); } catch { /* ignore */ }
      drawHandlerRef.current = null;
    }
  }, [resetTrigger]);

  // ライン描画完了ハンドラ
  const handleFinishLine = useCallback(() => {
    if (drawHandlerRef.current && drawMode === "polyline") {
      try {
        drawHandlerRef.current.completeShape?.();
      } catch { /* ignore */ }
    }
    onDrawModeChange?.(null);
  }, [drawMode, onDrawModeChange]);

  // 傾斜ヒートマップオーバーレイ（Canvas描画で高速化）
  useEffect(() => {
    const overlay = overlayGroupRef.current;
    overlay.clearLayers();

    if (!slopeOverlay) return;

    const { originLat, originLon, interval, slopeMatrix } = slopeOverlay;
    const rows = slopeMatrix.length;
    const cols = slopeMatrix[0]?.length ?? 0;
    if (rows === 0 || cols === 0) return;

    const EARTH_RADIUS_M = 6371000;
    const dLat = (interval / EARTH_RADIUS_M) * (180 / Math.PI);
    const centerLat = originLat;
    const dLon =
      (interval / (EARTH_RADIUS_M * Math.cos((centerLat * Math.PI) / 180))) *
      (180 / Math.PI);

    // Canvas で一括描画（DOM要素を大幅削減）
    const canvas = document.createElement("canvas");
    const scale = 4; // 高解像度化
    canvas.width = cols * scale;
    canvas.height = rows * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const deg = slopeMatrix[r][c];
        if (deg === null) continue;

        ctx.fillStyle = slopeToColor(deg);
        ctx.globalAlpha = 0.6;
        ctx.fillRect(c * scale, r * scale, scale, scale);
      }
    }

    // 画像オーバーレイとして追加
    const bounds: L.LatLngBoundsExpression = [
      [originLat - rows * dLat + dLat / 2, originLon - dLon / 2],
      [originLat + dLat / 2, originLon + cols * dLon - dLon / 2],
    ];

    const imageUrl = canvas.toDataURL("image/png");
    L.imageOverlay(imageUrl, bounds, { opacity: 1 }).addTo(overlay);
  }, [slopeOverlay]);

  // 断面ライン表示（ドラッグ可能なマーカー）
  const polylineRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);

  const updateCrossSectionLine = useCallback(() => {
    if (!startMarkerRef.current || !endMarkerRef.current) return;
    const startLatLng = startMarkerRef.current.getLatLng();
    const endLatLng = endMarkerRef.current.getLatLng();

    // ラインを更新
    if (polylineRef.current) {
      polylineRef.current.setLatLngs([startLatLng, endLatLng]);
    }

    // コールバックで親に通知（[lon, lat]形式）
    if (onCrossSectionLineRef.current) {
      onCrossSectionLineRef.current([
        [startLatLng.lng, startLatLng.lat],
        [endLatLng.lng, endLatLng.lat],
      ]);
    }
    setHasCrossSection(true);
  }, []);

  useEffect(() => {
    const layer = crossSectionLayerRef.current;
    layer.clearLayers();
    polylineRef.current = null;
    startMarkerRef.current = null;
    endMarkerRef.current = null;

    if (!crossSectionLineDisplay || crossSectionLineDisplay.length < 2) return;

    // [lon, lat] → [lat, lon] に変換
    const latlngs = crossSectionLineDisplay.map(([lon, lat]) => [lat, lon] as [number, number]);

    // ラインを描画
    const polyline = L.polyline(latlngs, {
      color: "#f59e0b",
      weight: 4,
      dashArray: "8, 4",
    }).addTo(layer);
    polylineRef.current = polyline;

    // ドラッグ可能なマーカー（始点・高）
    const startIcon = L.divIcon({
      className: "cross-section-marker draggable-marker",
      html: `<div style="width:28px;height:28px;background:#16a34a;color:#fff;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;box-shadow:0 3px 8px rgba(0,0,0,0.4);cursor:grab;">高</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    const startMarker = L.marker(latlngs[0], {
      icon: startIcon,
      draggable: true,
    }).addTo(layer);
    startMarkerRef.current = startMarker;

    // ドラッグ可能なマーカー（終点・低）
    const endIcon = L.divIcon({
      className: "cross-section-marker draggable-marker",
      html: `<div style="width:28px;height:28px;background:#dc2626;color:#fff;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;box-shadow:0 3px 8px rgba(0,0,0,0.4);cursor:grab;">低</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    const endMarker = L.marker(latlngs[latlngs.length - 1], {
      icon: endIcon,
      draggable: true,
    }).addTo(layer);
    endMarkerRef.current = endMarker;

    // ドラッグイベント
    startMarker.on("drag", () => {
      if (polylineRef.current && endMarkerRef.current) {
        polylineRef.current.setLatLngs([
          startMarker.getLatLng(),
          endMarkerRef.current.getLatLng(),
        ]);
      }
    });
    startMarker.on("dragend", updateCrossSectionLine);

    endMarker.on("drag", () => {
      if (polylineRef.current && startMarkerRef.current) {
        polylineRef.current.setLatLngs([
          startMarkerRef.current.getLatLng(),
          endMarker.getLatLng(),
        ]);
      }
    });
    endMarker.on("dragend", updateCrossSectionLine);

    setHasCrossSection(true);
  }, [crossSectionLineDisplay, updateCrossSectionLine]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />
      {/* ライン描画中の完了ボタン */}
      {drawMode === "polyline" && (
        <div className="absolute top-2 right-2 z-[1000]">
          <Button
            size="sm"
            className="h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
            onClick={handleFinishLine}
          >
            <Check className="h-4 w-4 mr-1" />
            ライン確定
          </Button>
        </div>
      )}
      {/* 操作ガイド */}
      <div className="absolute bottom-2 left-2 z-[1000] bg-black/70 text-white text-xs px-3 py-1.5 rounded max-w-[320px]">
        {analyzed && hasCrossSection ? (
          <>
            <b>高</b>/<b>低</b> マーカーをドラッグして断面ラインを調整できます
          </>
        ) : analyzed && !hasCrossSection ? (
          <>
            断面を確認するには、ツールバーの <b>ライン</b> ボタンでラインを引いてください
          </>
        ) : hasPolygon ? (
          "ポリゴン設定済み。「解析」ボタンを押してください"
        ) : (
          <>
            ツールバーの <b>ポリゴン</b> ボタンで調査範囲を描画してください
          </>
        )}
      </div>
    </div>
  );
}

const VERTEX_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function slopeToColor(degrees: number): string {
  if (degrees < 3) return "#22c55e";
  if (degrees < 8) return "#eab308";
  if (degrees < 15) return "#f97316";
  if (degrees < 30) return "#ef4444";
  return "#7f1d1d";
}
