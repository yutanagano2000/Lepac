"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  text: string;
  copiedText: string | null;
  onCopy: (text: string) => void;
}

function CopyButton({ text, copiedText, onCopy }: CopyButtonProps) {
  return (
    <button
      onClick={() => onCopy(text)}
      className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
      title="コピー"
    >
      {copiedText === text ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
      )}
    </button>
  );
}

interface InfoCardProps {
  title: string;
  content: string;
  copiedText: string | null;
  onCopy: (text: string) => void;
}

function InfoCard({ title, content, copiedText, onCopy }: InfoCardProps) {
  return (
    <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-xl font-semibold text-foreground mb-4">{title}</h2>
      <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
        <p className="flex-1 text-sm text-foreground leading-relaxed">{content}</p>
        <CopyButton text={content} copiedText={copiedText} onCopy={onCopy} />
      </div>
    </div>
  );
}

interface ProjectInfoDisplayProps {
  projectAddress: string | null;
  projectCoordinates: string | null;
  coordinates: { lat: string; lon: string } | null;
  copiedText: string | null;
  onCopy: (text: string) => void;
  getMappleUrl: () => string | null;
}

export function ProjectInfoDisplay({
  projectAddress,
  projectCoordinates,
  coordinates,
  copiedText,
  onCopy,
  getMappleUrl,
}: ProjectInfoDisplayProps) {
  if (!projectAddress && !projectCoordinates) return null;

  return (
    <div className="sticky top-0 z-10 bg-background pt-1 -mt-1 pb-4 space-y-4 border-b border-border/50 shadow-sm">
      {projectAddress && (
        <InfoCard
          title="現地住所"
          content={projectAddress}
          copiedText={copiedText}
          onCopy={onCopy}
        />
      )}

      {projectCoordinates && (
        <div className="bg-card rounded-4xl border border-border shadow-lg p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold text-foreground mb-4">現地座標</h2>
          <div className="flex items-start gap-2 p-4 rounded-2xl bg-muted/50 border border-border">
            <p className="flex-1 text-sm text-foreground leading-relaxed">
              {projectCoordinates}
            </p>
            <CopyButton
              text={projectCoordinates}
              copiedText={copiedText}
              onCopy={onCopy}
            />
          </div>
          {coordinates && getMappleUrl() && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild className="h-9">
                <a href={getMappleUrl() ?? ""} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Mappleで確認
                </a>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// CopyButtonも再利用できるようエクスポート
export { CopyButton };
