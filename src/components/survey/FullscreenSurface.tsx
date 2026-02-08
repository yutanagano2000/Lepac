"use client";

import { useState } from "react";
import { Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Surface3D } from "./Surface3D";

interface FullscreenSurfaceProps {
  z: (number | null)[][];
  interval: number;
  gridOrigin: { lat: number; lon: number };
  polygonCoords: [number, number][];
  crossSectionLine?: [number, number][] | null;
}

export function FullscreenSurface({
  z,
  interval,
  gridOrigin,
  polygonCoords,
  crossSectionLine,
}: FullscreenSurfaceProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
        onClick={() => setOpen(true)}
        title="フルスクリーン"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 overflow-hidden bg-background border-none">
          <DialogTitle className="sr-only">3D地形ビューワー（フルスクリーン）</DialogTitle>
          <div className="relative w-full h-full bg-background">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 z-20 bg-background/80 hover:bg-background"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="w-full h-full">
              <Surface3D
                z={z}
                interval={interval}
                gridOrigin={gridOrigin}
                polygonCoords={polygonCoords}
                crossSectionLine={crossSectionLine}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
