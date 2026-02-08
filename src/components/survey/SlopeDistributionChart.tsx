"use client";

interface DistributionItem {
  label: string;
  color: string;
  percent: number;
}

interface SlopeDistributionChartProps {
  distribution: DistributionItem[];
}

export function SlopeDistributionChart({ distribution }: SlopeDistributionChartProps) {
  // 表示順序を定義
  const order = ["平坦", "緩やか", "やや急", "急", "非常に急"];

  // 定義順にソート
  const sorted = [...distribution].sort((a, b) => {
    const aIdx = order.indexOf(a.label);
    const bIdx = order.indexOf(b.label);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  const maxPercent = Math.max(...distribution.map((d) => d.percent), 1);

  return (
    <div className="space-y-2">
      {sorted.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="w-16 text-xs text-muted-foreground shrink-0">
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden relative">
            <div
              className="h-full rounded-sm transition-all duration-500"
              style={{
                width: `${(item.percent / maxPercent) * 100}%`,
                backgroundColor: item.color,
              }}
            />
            <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-foreground/80">
              {item.percent.toFixed(1)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
