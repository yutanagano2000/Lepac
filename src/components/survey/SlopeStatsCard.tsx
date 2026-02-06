"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SlopeStats } from "@/lib/slope-analysis";

const BAR_COLORS: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  orange: "bg-orange-500",
  red: "bg-red-500",
  darkred: "bg-red-900",
};

export function SlopeStatsCard({
  stats,
  totalPoints,
}: {
  stats: SlopeStats;
  totalPoints: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">傾斜統計</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 数値グリッド */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">平均傾斜角</span>
            <p className="font-semibold text-lg">{stats.meanDegrees}°</p>
          </div>
          <div>
            <span className="text-muted-foreground">最大傾斜角</span>
            <p className="font-semibold text-lg">{stats.maxDegrees}°</p>
          </div>
          <div>
            <span className="text-muted-foreground">標高範囲</span>
            <p className="font-semibold text-lg">
              {stats.minElevation}〜{stats.maxElevation} m
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">高低差</span>
            <p className="font-semibold text-lg">{stats.elevationRange} m</p>
          </div>
          <div>
            <span className="text-muted-foreground">最小傾斜角</span>
            <p className="font-semibold">{stats.minDegrees}°</p>
          </div>
          <div>
            <span className="text-muted-foreground">標準偏差</span>
            <p className="font-semibold">{stats.stdDegrees}°</p>
          </div>
        </div>

        {/* 傾斜分布バー */}
        {stats.distribution.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              傾斜分類分布（計測点: {totalPoints}点）
            </p>
            <div className="space-y-1.5">
              {stats.distribution.map((d) => (
                <div key={d.label} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-right text-muted-foreground">
                    {d.label}
                  </span>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${BAR_COLORS[d.color] || "bg-gray-400"}`}
                      style={{ width: `${Math.max(d.percent, 1)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono">
                    {d.percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
