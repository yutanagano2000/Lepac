"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const Plot = dynamic(
  () => import("./PlotlyPlot"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full min-h-[350px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

const VERTEX_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const EARTH_RADIUS_M = 6371000;

/** 鉛直倍率（固定値） */
const EXAGGERATION = 2;

interface Surface3DProps {
  z: (number | null)[][];
  interval: number;
  gridOrigin?: { lat: number; lon: number };
  polygonCoords?: [number, number][];
  crossSectionLine?: [number, number][] | null;
}

function geoToSurface(
  lon: number,
  lat: number,
  originLat: number,
  originLon: number,
  interval: number,
  rows: number,
  z: (number | null)[][]
): { x: number; y: number; z: number } | null {
  const dLat = (interval / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLon =
    (interval / (EARTH_RADIUS_M * Math.cos((originLat * Math.PI) / 180))) *
    (180 / Math.PI);

  const row = (originLat - lat) / dLat;
  const col = (lon - originLon) / dLon;
  const ri = Math.round(row);
  const ci = Math.round(col);

  if (ri < 0 || ri >= z.length || ci < 0 || ci >= (z[0]?.length ?? 0)) return null;

  let elev = z[ri]?.[ci];
  if (elev === null || elev === undefined) {
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1]]) {
      const v = z[ri + dr]?.[ci + dc];
      if (v !== null && v !== undefined) { elev = v; break; }
    }
  }
  if (elev === null || elev === undefined) return null;

  return {
    x: col * interval,
    y: (rows - 1 - row) * interval,
    z: elev,
  };
}

export function Surface3D({ z, interval, gridOrigin, polygonCoords, crossSectionLine }: Surface3DProps) {
  const rows = z.length;
  const cols = z[0]?.length ?? 0;

  const x = Array.from({ length: cols }, (_, i) => i * interval);
  const y = Array.from({ length: rows }, (_, i) => (rows - 1 - i) * interval);

  const xRange = (cols - 1) * interval;
  const yRange = (rows - 1) * interval;

  // 標高の最小・最大を算出
  const { minElev, maxElev } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const row of z) {
      for (const v of row) {
        if (v !== null) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    if (!isFinite(min)) min = 0;
    if (!isFinite(max)) max = 0;
    return { minElev: min, maxElev: max };
  }, [z]);

  const elevRange = maxElev - minElev || 1;

  // ─── 実寸比率のアスペクト比を計算 ──────────────────
  // 水平方向の最大レンジを基準に、z軸を実寸 × 鉛直倍率で設定
  const maxHorizontal = Math.max(xRange, yRange) || 1;
  const aspectRatio = {
    x: xRange / maxHorizontal || 0.01,
    y: yRange / maxHorizontal || 0.01,
    z: Math.max((elevRange * EXAGGERATION) / maxHorizontal, 0.01),
  };

  // ─── ポリゴン頂点マーカー ─────────────────────────
  const extraTraces: any[] = [];

  if (polygonCoords && gridOrigin) {
    const unique =
      polygonCoords.length > 1 &&
      polygonCoords[0][0] === polygonCoords[polygonCoords.length - 1][0] &&
      polygonCoords[0][1] === polygonCoords[polygonCoords.length - 1][1]
        ? polygonCoords.slice(0, -1)
        : polygonCoords;

    const vx: number[] = [];
    const vy: number[] = [];
    const vz: number[] = [];
    const labels: string[] = [];
    const hoverTexts: string[] = [];

    unique.forEach((coord, i) => {
      if (i >= VERTEX_LABELS.length) return;
      const pos = geoToSurface(
        coord[0], coord[1],
        gridOrigin.lat, gridOrigin.lon,
        interval, rows, z
      );
      if (pos) {
        vx.push(pos.x);
        vy.push(pos.y);
        vz.push(pos.z + 0.5);
        labels.push(VERTEX_LABELS[i]);
        hoverTexts.push(`${VERTEX_LABELS[i]}地点\n標高: ${pos.z.toFixed(1)}m`);
      }
    });

    if (vx.length > 0) {
      extraTraces.push({
        type: "scatter3d",
        mode: "markers+text",
        x: vx, y: vy, z: vz,
        text: labels,
        textposition: "top center",
        textfont: { size: 14, color: "#1d4ed8", family: "Arial Black, sans-serif" },
        marker: { size: 8, color: "#1d4ed8", line: { color: "#fff", width: 2 } },
        hovertemplate: "%{hovertext}<extra></extra>",
        hovertext: hoverTexts,
        showlegend: false,
      });
    }
  }

  // ─── 方位マーカー（N/S/E/W） ──────────────────────
  const compassLabels = [
    { text: "N", x: xRange / 2, y: yRange + interval * 0.5, z: minElev },
    { text: "S", x: xRange / 2, y: -interval * 0.5, z: minElev },
    { text: "E", x: xRange + interval * 0.5, y: yRange / 2, z: minElev },
    { text: "W", x: -interval * 0.5, y: yRange / 2, z: minElev },
  ];

  extraTraces.push({
    type: "scatter3d",
    mode: "text",
    x: compassLabels.map((c) => c.x),
    y: compassLabels.map((c) => c.y),
    z: compassLabels.map((c) => c.z),
    text: compassLabels.map((c) => c.text),
    textfont: { size: 16, color: "#dc2626", family: "Arial Black, sans-serif" },
    hoverinfo: "skip",
    showlegend: false,
  });

  // ─── 断面ライン表示 ──────────────────────────────
  if (crossSectionLine && crossSectionLine.length >= 2 && gridOrigin) {
    const linePoints: { x: number; y: number; z: number }[] = [];

    for (const coord of crossSectionLine) {
      const pos = geoToSurface(
        coord[0], coord[1],
        gridOrigin.lat, gridOrigin.lon,
        interval, rows, z
      );
      if (pos) {
        linePoints.push(pos);
      }
    }

    if (linePoints.length >= 2) {
      // 断面ライン（オレンジの破線風）
      extraTraces.push({
        type: "scatter3d",
        mode: "lines",
        x: linePoints.map(p => p.x),
        y: linePoints.map(p => p.y),
        z: linePoints.map(p => p.z + 1), // 少し浮かせて表示
        line: { color: "#f59e0b", width: 6 },
        hoverinfo: "skip",
        showlegend: false,
      });

      // 始点マーカー（高点・緑）
      extraTraces.push({
        type: "scatter3d",
        mode: "markers+text",
        x: [linePoints[0].x],
        y: [linePoints[0].y],
        z: [linePoints[0].z + 2],
        text: ["高"],
        textposition: "top center",
        textfont: { size: 12, color: "#16a34a", family: "Arial Black, sans-serif" },
        marker: { size: 10, color: "#16a34a", line: { color: "#fff", width: 2 } },
        hovertemplate: `始点（高点）<br>標高: ${linePoints[0].z.toFixed(1)}m<extra></extra>`,
        showlegend: false,
      });

      // 終点マーカー（低点・赤）
      const endPoint = linePoints[linePoints.length - 1];
      extraTraces.push({
        type: "scatter3d",
        mode: "markers+text",
        x: [endPoint.x],
        y: [endPoint.y],
        z: [endPoint.z + 2],
        text: ["低"],
        textposition: "top center",
        textfont: { size: 12, color: "#dc2626", family: "Arial Black, sans-serif" },
        marker: { size: 10, color: "#dc2626", line: { color: "#fff", width: 2 } },
        hovertemplate: `終点（低点）<br>標高: ${endPoint.z.toFixed(1)}m<extra></extra>`,
        showlegend: false,
      });
    }
  }

  return (
    <div className="relative w-full h-full">
      {/* 高低差表示 */}
      <div className="absolute top-2 left-2 z-10 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
        高低差: {elevRange.toFixed(1)}m
      </div>

      {/* 3Dチャート */}
      <div className="w-full h-full">
        <Plot
          data={[
            {
              type: "surface",
              z: z,
              x: x,
              y: y,
              colorscale: "Earth",
              hovertemplate:
                "東西: %{x:.0f}m<br>南北: %{y:.0f}m<br>標高: %{z:.1f}m<extra></extra>",
              connectgaps: false,
            } as any,
            ...extraTraces,
          ]}
          layout={{
            autosize: true,
            margin: { l: 0, r: 0, t: 10, b: 0 },
            scene: {
              aspectmode: "manual",
              aspectratio: aspectRatio,
              xaxis: { title: { text: "" }, showticklabels: false },
              yaxis: { title: { text: "" }, showticklabels: false },
              zaxis: { title: { text: "標高 (m)" } },
              camera: {
                eye: { x: 0.15, y: -1.2, z: 0.8 }, // より近くから表示
                up: { x: 0, y: 0, z: 1 },
              },
            },
            paper_bgcolor: "transparent",
            showlegend: false,
          } as any}
          config={{
            displayModeBar: false,
            responsive: true,
            scrollZoom: true,
          }}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
