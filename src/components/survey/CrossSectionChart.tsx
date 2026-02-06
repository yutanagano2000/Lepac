"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
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

interface CrossSectionChartProps {
  data: CrossSectionPoint[];
}

export function CrossSectionChart({ data }: CrossSectionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-sm text-muted-foreground gap-2">
        <p>地図の右上にあるライン（折れ線）ツールで</p>
        <p>ポリゴン上に断面ラインを引くと、ここに断面図が表示されます</p>
      </div>
    );
  }

  const x = data.map((d) => d.distance);
  const y = data.map((d) => d.elevation);

  return (
    <Plot
      data={[
        {
          type: "scatter",
          mode: "lines",
          x,
          y,
          fill: "tozeroy",
          fillcolor: "rgba(59,130,246,0.15)",
          line: { color: "#3b82f6", width: 2 },
          hovertemplate: "距離: %{x:.1f}m<br>標高: %{y:.1f}m<extra></extra>",
        } as any,
      ]}
      layout={{
        autosize: true,
        margin: { l: 50, r: 20, t: 10, b: 40 },
        xaxis: { title: { text: "距離 (m)" } },
        yaxis: { title: { text: "標高 (m)" } },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
      } as any}
      config={{
        displayModeBar: false,
        responsive: true,
      }}
      useResizeHandler
      style={{ width: "100%", height: "100%" }}
    />
  );
}
