"use client";

interface SlopeLegendProps {
  className?: string;
}

const SLOPE_LEVELS = [
  { label: "平坦", range: "< 3°", color: "rgb(34, 197, 94)", bgClass: "bg-green-500" },
  { label: "緩やか", range: "3-8°", color: "rgb(234, 179, 8)", bgClass: "bg-yellow-500" },
  { label: "やや急", range: "8-15°", color: "rgb(249, 115, 22)", bgClass: "bg-orange-500" },
  { label: "急", range: "15-30°", color: "rgb(239, 68, 68)", bgClass: "bg-red-500" },
  { label: "非常に急", range: "> 30°", color: "rgb(127, 29, 29)", bgClass: "bg-red-900" },
];

export function SlopeLegend({ className }: SlopeLegendProps) {
  return (
    <div className={`bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 text-xs ${className || ""}`}>
      <p className="font-semibold mb-2 text-sm">傾斜凡例</p>
      <div className="space-y-1.5">
        {SLOPE_LEVELS.map((level) => (
          <div key={level.label} className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-sm shrink-0"
              style={{ backgroundColor: level.color }}
            />
            <span className="font-medium w-16">{level.label}</span>
            <span className="text-muted-foreground">{level.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
