"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ElevationPoint } from "@/lib/slope";

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

interface SurveyMapCoreProps {
  center: [number, number];
  points: ElevationPoint[];
}

const POINT_COLORS: Record<string, string> = {
  center: "#ef4444",
  north: "#3b82f6",
  south: "#3b82f6",
  east: "#3b82f6",
  west: "#3b82f6",
};

export default function SurveyMapCore({ center, points }: SurveyMapCoreProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 既存のマップがあれば削除
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 17,
      zoomControl: true,
    });

    // GSI航空写真タイル
    L.tileLayer(
      "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
      {
        attribution:
          '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
        maxZoom: 18,
      }
    ).addTo(map);

    // 中心マーカー
    L.marker(center).addTo(map).bindPopup(
      `<b>調査地点</b><br/>標高: ${points.find((p) => p.label === "center")?.elevation.toFixed(1)} m`
    );

    // 4サンプル点
    points
      .filter((p) => p.label !== "center")
      .forEach((pt) => {
        L.circleMarker([pt.lat, pt.lon], {
          radius: 6,
          color: POINT_COLORS[pt.label],
          fillColor: POINT_COLORS[pt.label],
          fillOpacity: 0.8,
          weight: 2,
        })
          .addTo(map)
          .bindPopup(
            `${pt.label.toUpperCase()}<br/>標高: ${pt.elevation.toFixed(1)} m`
          );
      });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, points]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[300px]" />;
}
