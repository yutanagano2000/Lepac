"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlopeDistributionChart } from "./SlopeDistributionChart";
import type { SlopeStats } from "@/lib/slope-analysis";

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

        {/* 傾斜分布ヒストグラム */}
        {stats.distribution.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              傾斜分類分布（計測点: {totalPoints.toLocaleString()}点）
            </p>
            <SlopeDistributionChart distribution={stats.distribution} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
