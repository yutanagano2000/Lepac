import { useMemo } from "react";

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

export function HighlightText({ text, query, className }: HighlightTextProps) {
  const parts = useMemo(() => {
    if (!query.trim()) return [{ text, highlighted: false }];

    // queryの特殊文字をエスケープ
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const segments = text.split(regex);

    return segments
      .filter((s) => s.length > 0)
      .map((segment) => ({
        text: segment,
        highlighted: regex.test(segment),
      }));
  }, [text, query]);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.highlighted ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-800/60 text-inherit rounded-sm px-0.5"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}
