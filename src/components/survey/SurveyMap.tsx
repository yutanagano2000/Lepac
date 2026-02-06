"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { ElevationPoint } from "@/lib/slope";

const SurveyMapCore = dynamic(() => import("./SurveyMapCore"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[300px]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface SurveyMapProps {
  center: [number, number];
  points: ElevationPoint[];
}

export function SurveyMap({ center, points }: SurveyMapProps) {
  return <SurveyMapCore center={center} points={points} />;
}
