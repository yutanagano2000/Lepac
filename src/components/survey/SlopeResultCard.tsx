"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SlopeResult } from "@/lib/slope";

const BADGE_COLORS: Record<string, string> = {
  green: "bg-green-500 text-white hover:bg-green-500",
  yellow: "bg-yellow-400 text-black hover:bg-yellow-400",
  orange: "bg-orange-500 text-white hover:bg-orange-500",
  red: "bg-red-500 text-white hover:bg-red-500",
  darkred: "bg-red-900 text-white hover:bg-red-900",
};

export function SlopeResultCard({ result }: { result: SlopeResult }) {
  const { points, classification } = result;
  const north = points.find((p) => p.label === "north");
  const south = points.find((p) => p.label === "south");
  const east = points.find((p) => p.label === "east");
  const west = points.find((p) => p.label === "west");
  const center = points.find((p) => p.label === "center");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>傾斜判定結果</span>
          <Badge className={BADGE_COLORS[classification.color] || ""}>
            {classification.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 数値グリッド */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">中心標高</span>
            <p className="font-semibold text-lg">{result.centerElevation.toFixed(1)} m</p>
          </div>
          <div>
            <span className="text-muted-foreground">傾斜角</span>
            <p className="font-semibold text-lg">{result.slopeDegrees.toFixed(2)}°</p>
          </div>
          <div>
            <span className="text-muted-foreground">傾斜率</span>
            <p className="font-semibold text-lg">{result.slopePercent.toFixed(2)}%</p>
          </div>
          <div>
            <span className="text-muted-foreground">最急勾配方向</span>
            <p className="font-semibold text-lg">
              {result.aspectDirection}（{result.aspectDegrees}°）
            </p>
          </div>
        </div>

        {/* 十字型標高ビジュアル */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">5点標高（m）</p>
          <div className="grid grid-cols-3 gap-1 max-w-[200px] mx-auto text-center text-xs">
            <div />
            <div className="bg-muted rounded px-2 py-1">
              <span className="text-muted-foreground block">N</span>
              <span className="font-mono font-semibold">{north?.elevation.toFixed(1)}</span>
            </div>
            <div />

            <div className="bg-muted rounded px-2 py-1">
              <span className="text-muted-foreground block">W</span>
              <span className="font-mono font-semibold">{west?.elevation.toFixed(1)}</span>
            </div>
            <div className="bg-primary/10 border border-primary rounded px-2 py-1">
              <span className="text-muted-foreground block">C</span>
              <span className="font-mono font-semibold">{center?.elevation.toFixed(1)}</span>
            </div>
            <div className="bg-muted rounded px-2 py-1">
              <span className="text-muted-foreground block">E</span>
              <span className="font-mono font-semibold">{east?.elevation.toFixed(1)}</span>
            </div>

            <div />
            <div className="bg-muted rounded px-2 py-1">
              <span className="text-muted-foreground block">S</span>
              <span className="font-mono font-semibold">{south?.elevation.toFixed(1)}</span>
            </div>
            <div />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
