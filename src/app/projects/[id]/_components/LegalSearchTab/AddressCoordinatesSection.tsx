"use client";

import { useState, useEffect, useRef } from "react";
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
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCompact(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  if (!projectAddress && !projectCoordinates) return null;

  return (
    <>
      {/* 通常表示 - スクロールで自然に流れる */}
      <div ref={sectionRef} className="space-y-4 pb-4 border-b border-border/50 shadow-sm">
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

      {/* コンパクトバー - ヘッダー直下に固定表示 */}
      {isCompact && (
        <div className="fixed top-14 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mx-auto max-w-7xl flex items-center gap-3 px-4 sm:px-6 py-2 min-h-[44px]">
            {projectAddress && (
              <span className="text-sm text-foreground truncate min-w-0" title={projectAddress}>
                {projectAddress}
              </span>
            )}
            {projectAddress && projectCoordinates && (
              <span className="text-muted-foreground shrink-0">|</span>
            )}
            {projectCoordinates && (
              <span className="text-sm text-muted-foreground shrink-0">
                {projectCoordinates}
              </span>
            )}
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              {projectAddress && (
                <button
                  onClick={() => onCopy(projectAddress)}
                  className="p-1.5 rounded hover:bg-accent transition-colors"
                  title="住所コピー"
                >
                  {copiedText === projectAddress ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              )}
              {projectCoordinates && (
                <button
                  onClick={() => onCopy(projectCoordinates)}
                  className="p-1.5 rounded hover:bg-accent transition-colors"
                  title="座標コピー"
                >
                  {copiedText === projectCoordinates ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              )}
              {coordinates && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => window.open(
                      `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lon}`,
                      '_blank'
                    )}
                  >
                    Google Map
                  </Button>
                  {mappleUrl && (
                    <Button variant="outline" size="sm" asChild className="h-7 text-xs px-2">
                      <a href={mappleUrl} target="_blank" rel="noopener noreferrer">
                        MAPPLE
                      </a>
                    </Button>
                  )}
                  {prefecture === "okayama" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => window.open('https://www.gis.pref.okayama.jp/pref-okayama/PositionSelect?mid=7', '_blank')}
                    >
                      GIS
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
