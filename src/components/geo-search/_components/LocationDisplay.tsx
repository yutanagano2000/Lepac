"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { LocationInfo } from "../_types";

interface LocationDisplayProps {
  locationInfo: LocationInfo;
  latitude: string;
  longitude: string;
  prefecture: string;
  mappleUrl: string | null;
  copiedText: string | null;
  onCopy: (text: string) => void;
}

export function LocationDisplay({
  locationInfo,
  latitude,
  longitude,
  prefecture,
  mappleUrl,
  copiedText,
  onCopy,
}: LocationDisplayProps) {
  if (!locationInfo.shortAddress) return null;

  return (
    <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-xl font-semibold text-foreground mb-4">現地住所</h2>
      <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
        <p className="flex-1 text-sm text-foreground leading-relaxed">
          {locationInfo.shortAddress}
        </p>
        <button
          onClick={() => onCopy(locationInfo.shortAddress)}
          className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
          title="コピー"
        >
          {copiedText === locationInfo.shortAddress ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          )}
        </button>
      </div>
      {/* 地図確認ボタン */}
      <div className="flex flex-wrap gap-2">
        {mappleUrl && (
          <Button variant="outline" size="sm" asChild className="h-9">
            <a href={mappleUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-2" />
              MAPPLE
            </a>
          </Button>
        )}
        <Button
          onClick={() =>
            window.open(
              `https://www.google.com/maps?q=${latitude},${longitude}`,
              "_blank"
            )
          }
          className="flex-1"
        >
          Google Mapで確認
        </Button>
        {/* 岡山県の場合のみGISリンクを表示 */}
        {prefecture === "okayama" && (
          <Button
            onClick={() =>
              window.open(
                "https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7",
                "_blank"
              )
            }
            className="flex-1"
          >
            おかやま全県統合型GIS
          </Button>
        )}
      </div>
    </div>
  );
}
