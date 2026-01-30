"use client";

import { useState, useMemo } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  parseCoordinateString,
  normalizeCoordinateString,
} from "@/lib/coordinates";

function getMappleUrl(coords: string | null): string | null {
  const parsed = coords ? parseCoordinateString(coords) : null;
  if (!parsed) return null;
  return `https://labs.mapple.com/mapplexml.html#16/${parsed.lat}/${parsed.lon}`;
}

function getGoogleMapsUrl(coords: string | null, address: string | null): string | null {
  if (coords) {
    const parsed = parseCoordinateString(coords);
    if (parsed) {
      return `https://www.google.com/maps?q=${parsed.lat},${parsed.lon}`;
    }
  }
  if (address?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
  }
  return null;
}

function getHazardMapUrl(coords: string | null): string | null {
  const parsed = coords ? parseCoordinateString(coords) : null;
  if (!parsed) return null;
  return `https://disaportal.gsi.go.jp/maps/?ll=${parsed.lat},${parsed.lon}&z=16&base=ort&vs=c1j0l0u0t0h0z0`;
}

export default function MapPage() {
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState("");

  const hasValidCoords = useMemo(
    () => parseCoordinateString(coordinates) !== null,
    [coordinates]
  );

  const handleCoordinatesChange = (value: string) => {
    setCoordinates(value);
  };

  const handleCoordinatesBlur = () => {
    const normalized = normalizeCoordinateString(coordinates);
    if (normalized) setCoordinates(normalized);
  };

  const mappleUrl = getMappleUrl(hasValidCoords ? coordinates : null);
  const googleMapsUrl = getGoogleMapsUrl(hasValidCoords ? coordinates : null, address.trim() ? address : null);
  const hazardMapUrl = getHazardMapUrl(hasValidCoords ? coordinates : null);

  const googleEnabled = !!googleMapsUrl;
  const coordsOnlyEnabled = hasValidCoords;

  return (
    <div className="min-h-screen bg-background px-6">
      <div className="mx-auto max-w-2xl py-10">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold text-foreground">マップ</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            おおよその住所を入力したあと、詳しい座標を追加できます。両方入力した場合は座標で地図を開きます。
          </p>

          {/* 1. おおよその場所（現地住所） */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 1</span>
              <Label htmlFor="map-address" className="text-base font-medium text-foreground">
                おおよその場所（現地住所）
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              大まかな場所の把握用。ここだけ入力してもGoogle Mapで開けます。
            </p>
            <Input
              id="map-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="例: 広島県広島市安佐北区..."
              className="w-full h-11 text-base"
            />
          </div>

          {/* 2. 正確な位置（座標） */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-baseline gap-2 pt-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step 2</span>
              <Label htmlFor="map-coordinates" className="text-base font-medium text-foreground">
                正確な位置（座標）
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              詳しい座標を入力すると、MAPPLE・ハザードも開けます。住所と両方ある場合は座標で開きます。
            </p>
            <Input
              id="map-coordinates"
              value={coordinates}
              onChange={(e) => handleCoordinatesChange(e.target.value)}
              onBlur={handleCoordinatesBlur}
              placeholder="例: 34.3963, 132.4596 または 34.39/132.45"
              className="w-full font-mono text-base h-11"
            />
          </div>

          {/* 住所 or 座標で開く = Google Map のみ */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              住所または座標で開く
            </h2>
            <p className="text-sm text-foreground/80">
              現地住所を入力するだけで開けます。座標を入力した場合は座標で開きます。
            </p>
            <Card className="overflow-hidden bg-zinc-900 border-zinc-800">
              <CardContent className="p-0">
                <a
                  href={googleMapsUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => !googleMapsUrl && e.preventDefault()}
                  className={`flex items-center justify-between gap-4 w-full px-5 py-4 text-left transition-colors ${
                    googleEnabled
                      ? "hover:bg-zinc-800 active:bg-zinc-700 cursor-pointer"
                      : "opacity-50 cursor-not-allowed pointer-events-none"
                  }`}
                >
                  <span className="font-medium text-zinc-100">Google Map</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-zinc-400" />
                </a>
              </CardContent>
            </Card>
          </div>

          {/* 座標で開く = MAPPLE・ハザード */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              座標で開く
            </h2>
            <p className="text-sm text-foreground/80">
              座標の入力が必要です。上記の座標欄に入力してください。
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="overflow-hidden bg-zinc-900 border-zinc-800">
                <CardContent className="p-0">
                  <a
                    href={mappleUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => !mappleUrl && e.preventDefault()}
                    className={`flex items-center justify-between gap-4 w-full px-5 py-4 text-left transition-colors ${
                      coordsOnlyEnabled
                        ? "hover:bg-zinc-800 active:bg-zinc-700 cursor-pointer"
                        : "opacity-50 cursor-not-allowed pointer-events-none"
                    }`}
                  >
                    <span className="font-medium text-zinc-100">MAPPLE</span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-zinc-400" />
                  </a>
                </CardContent>
              </Card>
              <Card className="overflow-hidden bg-zinc-900 border-zinc-800">
                <CardContent className="p-0">
                  <a
                    href={hazardMapUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => !hazardMapUrl && e.preventDefault()}
                    className={`flex items-center justify-between gap-4 w-full px-5 py-4 text-left transition-colors ${
                      coordsOnlyEnabled
                        ? "hover:bg-zinc-800 active:bg-zinc-700 cursor-pointer"
                        : "opacity-50 cursor-not-allowed pointer-events-none"
                    }`}
                  >
                    <span className="font-medium text-zinc-100">ハザード</span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-zinc-400" />
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
