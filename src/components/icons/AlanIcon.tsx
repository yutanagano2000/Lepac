import { cn } from "@/lib/utils";

interface AlanIconProps {
  className?: string;
}

export function AlanIcon({ className }: AlanIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-5 w-5", className)}
    >
      {/* 帽子本体（塗りつぶし） */}
      <path
        d="M3 8.5 L7 9.5 C7 7 9 4.5 13 4 C17 3.5 20 5.5 20.5 8.5 L20.5 10 L18 10 L18 9 C18 7 16 5.5 13 6 C10.5 6.5 9 8 9 10 L3 8.5 Z"
        fill="currentColor"
      />
      {/* 帽子のつば */}
      <path
        d="M3 8.5 L7 9.5 L9 10 L3.5 9.5 Z"
        fill="currentColor"
      />
      {/* 帽子のボタン */}
      <circle cx="13" cy="3.5" r="0.8" fill="currentColor" />
      {/* 帽子の調整部分（snapback） */}
      <rect x="18" y="9" width="2.5" height="1.5" rx="0.3" fill="currentColor" />
      {/* 顔の輪郭（額〜鼻〜口〜顎） */}
      <path
        d="M9 10
           C8.5 11 8 12 8 12.5
           L7.5 13.5
           C7 14.5 6.5 15 6.5 15.5
           C7 15.5 7.5 15.5 7.5 16
           C7.5 16.5 7 17 7 17.5
           C8 18 9 18.5 10 18.5
           C11 18.5 12 18 13 17.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* 後頭部〜首の後ろ */}
      <path
        d="M20.5 10
           C21 12 20.5 14 19 16
           C18 17 17 17.5 16 18
           L15 18.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* 顎から首 */}
      <path
        d="M13 17.5 C13 18 13 19 12.5 20"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* 首の後ろ */}
      <path
        d="M15 18.5 C15 19.5 15.5 20.5 16 21"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* 襟 */}
      <path
        d="M12.5 20 C13 20 14 20 15 19.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M16 21 L17 22"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* 耳 */}
      <path
        d="M18.5 12 C19.5 12.5 19.5 14 19 14.5 C18.5 15 18 14.5 18 14"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* 眉毛 */}
      <path
        d="M8 11.5 L10 11.5"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* 目 */}
      <ellipse cx="9" cy="13" rx="0.5" ry="0.7" fill="currentColor" />
    </svg>
  );
}
