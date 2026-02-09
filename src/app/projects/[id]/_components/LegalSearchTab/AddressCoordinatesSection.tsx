"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink } from "lucide-react";

interface AddressCoordinatesSectionProps {
  projectAddress: string | null;
  projectCoordinates: string | null;
  copiedText: string | null;
  onCopy: (text: string) => void;
  coordinates: { lat: string; lon: string } | null;
  mappleUrl: string | null;
  prefecture: string;
}

export function AddressCoordinatesSection({
  projectAddress,
  projectCoordinates,
  copiedText,
  onCopy,
  coordinates,
  mappleUrl,
  prefecture,
}: AddressCoordinatesSectionProps) {
  if (!projectAddress && !projectCoordinates) return null;

  return (
    <div className="sticky top-0 z-10 bg-background pt-1 -mt-1 pb-4 space-y-4 border-b border-border/50 shadow-sm">
      {projectAddress && (
        <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold text-foreground mb-4">現地住所</h2>
          <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
            <p className="flex-1 text-sm text-foreground leading-relaxed">
              {projectAddress}
            </p>
            <button
              onClick={() => onCopy(projectAddress)}
              className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
              title="コピー"
            >
              {copiedText === projectAddress ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              )}
            </button>
          </div>
        </div>
      )}

      {projectCoordinates && (
        <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold text-foreground mb-4">現地座標</h2>
          <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
            <p className="flex-1 text-sm text-foreground leading-relaxed">
              {projectCoordinates}
            </p>
            <button
              onClick={() => onCopy(projectCoordinates)}
              className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
              title="コピー"
            >
              {copiedText === projectCoordinates ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              )}
            </button>
          </div>
          {coordinates && (
            <div className="flex flex-wrap gap-2">
              {mappleUrl && (
                <Button variant="outline" size="sm" asChild className="h-9">
                  <a
                    href={mappleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    MAPPLE
                  </a>
                </Button>
              )}
              <Button
                onClick={() => window.open(
                  `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lon}`,
                  '_blank'
                )}
                className="flex-1"
              >
                Google Mapで確認
              </Button>
              {prefecture === "okayama" && (
                <Button
                  onClick={() => window.open('https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7', '_blank')}
                  className="flex-1"
                >
                  おかやま全県統合型GIS
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
