"use client";

import dynamic from "next/dynamic";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CrossSectionPoint } from "@/lib/slope-analysis";

const Plot = dynamic(
  () => import("react-plotly.js").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

/** 鉛直誇張（固定値） */
const EXAGGERATION = 5;

interface CrossSectionChartProps {
  data: CrossSectionPoint[];
}

// 傾斜角から色を取得
function getSlopeColor(degrees: number): string {
  if (degrees < 3) return "rgb(34, 197, 94)"; // 緑
  if (degrees < 8) return "rgb(234, 179, 8)"; // 黄
  if (degrees < 15) return "rgb(249, 115, 22)"; // オレンジ
  if (degrees < 30) return "rgb(239, 68, 68)"; // 赤
  return "rgb(127, 29, 29)"; // 濃い赤
}

// 傾斜ラベルを取得
function getSlopeLabel(degrees: number): string {
  if (degrees < 3) return "平坦";
  if (degrees < 8) return "緩やか";
  if (degrees < 15) return "やや急";
  if (degrees < 30) return "急";
  return "非常に急";
}

export function CrossSectionChart({ data }: CrossSectionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-sm text-muted-foreground gap-2">
        <p>断面を確認するには、ツールバーの <strong>ライン</strong> ボタンで</p>
        <p>ポリゴン上にラインを引いてください</p>
      </div>
    );
  }

  const x = data.map((d) => d.distance);
  const y = data.map((d) => d.elevation);

  // 標高の範囲
  const minElev = Math.min(...y);
  const maxElev = Math.max(...y);
  const elevRange = maxElev - minElev || 1;

  // 各セグメントの傾斜角を計算
  const slopes: number[] = [];
  const slopeColors: string[] = [];

  for (let i = 1; i < data.length; i++) {
    const dx = data[i].distance - data[i - 1].distance;
    const dy = data[i].elevation - data[i - 1].elevation;
    const slopeDeg = Math.abs(Math.atan(dy / dx) * (180 / Math.PI));
    slopes.push(slopeDeg);
    slopeColors.push(getSlopeColor(slopeDeg));
  }

  // 統計計算
  const avgSlope = slopes.length > 0
    ? slopes.reduce((a, b) => a + b, 0) / slopes.length
    : 0;
  const maxSlope = slopes.length > 0 ? Math.max(...slopes) : 0;
  const totalDistance = data.length > 0 ? data[data.length - 1].distance : 0;
  const elevationChange = data.length > 0
    ? data[data.length - 1].elevation - data[0].elevation
    : 0;

  // 傾斜の色付きセグメントを生成
  const traces: any[] = [];

  // まずベースの塗りつぶしエリア
  traces.push({
    type: "scatter",
    mode: "lines",
    x,
    y,
    fill: "tozeroy",
    fillcolor: "rgba(59,130,246,0.1)",
    line: { color: "transparent", width: 0 },
    showlegend: false,
    hoverinfo: "skip",
  });

  // 各セグメントを色分けして描画
  for (let i = 1; i < data.length; i++) {
    traces.push({
      type: "scatter",
      mode: "lines",
      x: [data[i - 1].distance, data[i].distance],
      y: [data[i - 1].elevation, data[i].elevation],
      line: { color: slopeColors[i - 1], width: 4 },
      showlegend: false,
      hovertemplate: `距離: ${data[i].distance.toFixed(1)}m<br>標高: ${data[i].elevation.toFixed(1)}m<br>傾斜: ${slopes[i - 1].toFixed(1)}° (${getSlopeLabel(slopes[i - 1])})<extra></extra>`,
    });
  }

  return (
    <div className="h-full flex flex-col">
      {/* 統計サマリー */}
      <div className="flex items-center justify-between px-2 py-2 bg-muted/30 rounded-lg mb-2">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getSlopeColor(avgSlope) }}
            />
            <span className="text-muted-foreground">平均傾斜:</span>
            <span className="font-semibold">{avgSlope.toFixed(1)}°</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getSlopeColor(maxSlope) }}
            />
            <span className="text-muted-foreground">最大傾斜:</span>
            <span className="font-semibold">{maxSlope.toFixed(1)}°</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">距離:</span>
            <span className="font-semibold">{totalDistance.toFixed(1)}m</span>
          </div>
          <div className="flex items-center gap-1">
            {elevationChange > 0.5 ? (
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            ) : elevationChange < -0.5 ? (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="font-semibold">
              {elevationChange > 0 ? "+" : ""}
              {elevationChange.toFixed(1)}m
            </span>
          </div>
        </div>
      </div>

      {/* チャート */}
      <div className="flex-1 min-h-0">
        <Plot
          data={traces}
          layout={{
            autosize: true,
            margin: { l: 50, r: 15, t: 5, b: 35 },
            xaxis: {
              title: { text: "距離 (m)", font: { size: 11 } },
              gridcolor: "rgba(0,0,0,0.08)",
              tickfont: { size: 10 },
              range: [-totalDistance * 0.02, totalDistance * 1.02],
              fixedrange: false,
            },
            yaxis: {
              title: { text: `標高 (m) [${EXAGGERATION}x誇張]`, font: { size: 11 } },
              gridcolor: "rgba(0,0,0,0.08)",
              tickfont: { size: 10 },
              // 誇張が大きいほどY軸範囲を狭く（傾斜を強調）
              range: [
                minElev - (elevRange * 0.15) / EXAGGERATION,
                maxElev + (elevRange * 0.15) / EXAGGERATION,
              ],
              fixedrange: false,
            },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            hovermode: "closest",
          } as any}
          config={{
            displayModeBar: false,
            responsive: true,
          }}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* 傾斜凡例（コンパクト） */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground pt-1 border-t">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>&lt;3°</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>3-8°</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span>8-15°</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>15-30°</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-900" />
          <span>&gt;30°</span>
        </div>
      </div>
    </div>
  );
}
