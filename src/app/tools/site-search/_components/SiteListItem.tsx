"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ExternalLink, Star, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { SITE_STATUS_OPTIONS } from "@/lib/site-scoring";
import type { SavedSite } from "@/db/schema";

interface Props {
  site: SavedSite;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}

function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-4 w-4 ${i <= count ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
      ))}
    </span>
  );
}

export function SiteListItem({ site, onStatusChange, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const details = site.scoreDetails ? JSON.parse(site.scoreDetails) : [];
  const statusOption = SITE_STATUS_OPTIONS.find(o => o.value === site.status);

  const emaffUrl = `https://map.maff.go.jp/?lat=${site.latitude}&lon=${site.longitude}&z=16`;

  return (
    <Card className="transition-colors hover:bg-accent/50">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          {/* ☆ */}
          <div className="flex flex-col items-center min-w-[50px]">
            <Stars count={site.stars ?? 0} />
            <span className="text-xs text-muted-foreground mt-0.5">{site.score}点</span>
          </div>

          {/* メイン */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">
                {site.address || `${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)}`}
              </span>
              {site.landCategory && <Badge variant="outline" className="text-xs">{site.landCategory}</Badge>}
              {site.areaSqm && <Badge variant="secondary" className="text-xs">{site.areaSqm.toLocaleString()}㎡</Badge>}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {site.noushinClass && <span>農振: {site.noushinClass}</span>}
              {site.cityPlanningClass && <span>都計: {site.cityPlanningClass}</span>}
              {site.ownerIntention && <span>意向: {site.ownerIntention}</span>}
            </div>
            {site.memo && <p className="text-xs text-muted-foreground truncate">{site.memo}</p>}
          </div>

          {/* ステータス・アクション */}
          <div className="flex items-center gap-2 shrink-0">
            <Select value={site.status} onValueChange={(v) => onStatusChange(site.id, v)}>
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SITE_STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* 展開時の詳細 */}
        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div className="text-xs font-medium">スコア内訳</div>
            <div className="grid grid-cols-2 gap-1">
              {details.map((d: { factor: string; points: number; reason: string }, i: number) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{d.factor}</span>
                  <span className={d.points > 0 ? "text-green-600" : d.points < 0 ? "text-red-600" : ""}>
                    {d.points > 0 ? `+${d.points}` : d.points} ({d.reason})
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <a href={emaffUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-7">
                  <ExternalLink className="h-3 w-3 mr-1" />eMAFF農地ナビ
                </Button>
              </a>
              <a href={`https://disaportal.gsi.go.jp/maps/index.html?ll=${site.latitude},${site.longitude}&z=15`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-7">
                  <MapPin className="h-3 w-3 mr-1" />ハザードマップ
                </Button>
              </a>
              <Button variant="destructive" size="sm" className="text-xs h-7 ml-auto" onClick={() => onDelete(site.id)}>
                <Trash2 className="h-3 w-3 mr-1" />削除
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              ⚠️ 一次判定です。農地種別（第1種/2種/3種）は農業委員会にご確認ください。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
