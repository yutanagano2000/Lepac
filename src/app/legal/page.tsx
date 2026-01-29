import { Suspense } from "react";
import { GeoSearchView } from "@/components/GeoSearchView";

function LegalPageContent() {
  return <GeoSearchView />;
}

export default function LegalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">読み込み中...</div>}>
      <LegalPageContent />
    </Suspense>
  );
}

