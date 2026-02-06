"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

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

type TileType = "std" | "photo";

const TILES: Record<TileType, { url: string; label: string }> = {
  photo: {
    url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
    label: "航空写真",
  },
  std: {
    url: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
    label: "標準",
  },
};

const ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>';

interface PolygonDrawMapCoreProps {
  /** ポリゴン確定コールバック: coordinates は [lon, lat][] (GeoJSON形式) */
  onPolygonReady: (coords: [number, number][]) => void;
  /** 断面ライン確定コールバック: coordinates は [lon, lat][] */
  onCrossSectionLine?: (coords: [number, number][]) => void;
  /** 傾斜ヒートマップデータ（オプション） */
  slopeOverlay?: {
    originLat: number;
    originLon: number;
    interval: number;
    slopeMatrix: (number | null)[][];
  };
  /** 地図をこの座標にジャンプ（変更されるたびに flyTo） */
  flyTo?: [number, number] | null;
  /** 解析済みかどうか（断面ライン案内の切替に使用） */
  analyzed?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
}

export default function PolygonDrawMapCore({
  onPolygonReady,
  onCrossSectionLine,
  slopeOverlay,
  flyTo,
  analyzed = false,
  initialCenter = [36.0, 138.0],
  initialZoom = 5,
}: PolygonDrawMapCoreProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const overlayGroupRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const labelGroupRef = useRef<L.LayerGroup>(new L.LayerGroup());
  const [activeTile, setActiveTile] = useState<TileType>("photo");
  const [hasPolygon, setHasPolygon] = useState(false);
  const [hasCrossSection, setHasCrossSection] = useState(false);

  // コールバックを ref に保持（Leaflet イベントハンドラ内の stale closure を回避）
  const onPolygonReadyRef = useRef(onPolygonReady);
  const onCrossSectionLineRef = useRef(onCrossSectionLine);
  useEffect(() => { onPolygonReadyRef.current = onPolygonReady; }, [onPolygonReady]);
  useEffect(() => { onCrossSectionLineRef.current = onCrossSectionLine; }, [onCrossSectionLine]);

  // タイル切替
  const switchTile = useCallback((type: TileType) => {
    if (tileRef.current) {
      tileRef.current.setUrl(TILES[type].url);
      setActiveTile(type);
    }
  }, []);

  // 頂点ラベルマーカーを配置
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
      zoomControl: true,
    });

    const tile = L.tileLayer(TILES.photo.url, {
      attribution: ATTRIBUTION,
      maxZoom: 18,
    }).addTo(map);
    tileRef.current = tile;

    featureGroupRef.current.addTo(map);
    overlayGroupRef.current.addTo(map);
    labelGroupRef.current.addTo(map);

    // Draw control
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

    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      featureGroupRef.current.addLayer(layer);

      if (e.layerType === "polygon") {
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        const coords: [number, number][] = latlngs.map((ll: L.LatLng) => [
          ll.lng,
          ll.lat,
        ]);
        // 閉じたポリゴンにする
        coords.push(coords[0]);
        setHasPolygon(true);
        // 頂点ラベル(A,B,C...)を配置
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
    });

    map.on(L.Draw.Event.DELETED, () => {
      // 削除後、ポリゴン・ラインが残っているか確認
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

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // flyTo: 座標ジャンプ
  useEffect(() => {
    if (!mapRef.current || !flyTo) return;
    mapRef.current.flyTo(flyTo, 17, { duration: 1.2 });
  }, [flyTo]);

  // 傾斜ヒートマップオーバーレイ
  useEffect(() => {
    const overlay = overlayGroupRef.current;
    overlay.clearLayers();

    if (!slopeOverlay) return;

    const { originLat, originLon, interval, slopeMatrix } = slopeOverlay;
    const EARTH_RADIUS_M = 6371000;
    const dLat = (interval / EARTH_RADIUS_M) * (180 / Math.PI);
    const centerLat = originLat;
    const dLon =
      (interval / (EARTH_RADIUS_M * Math.cos((centerLat * Math.PI) / 180))) *
      (180 / Math.PI);

    for (let r = 0; r < slopeMatrix.length; r++) {
      for (let c = 0; c < slopeMatrix[r].length; c++) {
        const deg = slopeMatrix[r][c];
        if (deg === null) continue;

        const lat = originLat - r * dLat;
        const lon = originLon + c * dLon;

        const color = slopeToColor(deg);
        L.rectangle(
          [
            [lat - dLat / 2, lon - dLon / 2],
            [lat + dLat / 2, lon + dLon / 2],
          ],
          {
            color: "transparent",
            fillColor: color,
            fillOpacity: 0.5,
            weight: 0,
          }
        ).addTo(overlay);
      }
    }
  }, [slopeOverlay]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />
      {/* タイル切替ボタン */}
      <div className="absolute top-2 left-2 z-[1000] flex gap-1">
        {(Object.keys(TILES) as TileType[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTile(t)}
            className={`px-2 py-1 text-xs rounded shadow ${
              activeTile === t
                ? "bg-primary text-primary-foreground"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {TILES[t].label}
          </button>
        ))}
      </div>
      {/* 操作ガイド */}
      <div className="absolute bottom-2 left-2 z-[1000] bg-black/70 text-white text-xs px-3 py-1.5 rounded max-w-[320px]">
        {analyzed && !hasCrossSection ? (
          <>
            断面を確認するには、右上の <span className="inline-block w-3 h-0.5 bg-yellow-400 align-middle mx-0.5" /> <b>ライン（折れ線）</b>ツールでポリゴン上にラインを引いてください
          </>
        ) : analyzed && hasCrossSection ? (
          "断面ラインを設定済み。下の断面プロファイルを確認してください"
        ) : hasPolygon ? (
          "ポリゴン設定済み。「解析」ボタンを押してください"
        ) : (
          <>
            右上の <b>ポリゴン</b>ツールで調査範囲を描画してください
          </>
        )}
      </div>
    </div>
  );
}

const VERTEX_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function slopeToColor(degrees: number): string {
  if (degrees < 3) return "#22c55e";   // green
  if (degrees < 8) return "#eab308";   // yellow
  if (degrees < 15) return "#f97316";  // orange
  if (degrees < 30) return "#ef4444";  // red
  return "#7f1d1d";                    // darkred
}
