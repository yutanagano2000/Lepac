export const PHOTO_CATEGORIES = [
  { id: "着工前", label: "着工前", color: "bg-amber-500" },
  { id: "造成後", label: "造成後", color: "bg-lime-500" },
  { id: "載荷試験", label: "載荷試験", color: "bg-indigo-500" },
  { id: "杭打ち", label: "杭打ち", color: "bg-red-500" },
  { id: "ケーブル埋設", label: "ケーブル埋設", color: "bg-purple-500" },
  { id: "架台組立", label: "架台組立", color: "bg-blue-500" },
  { id: "パネル", label: "パネル", color: "bg-emerald-500" },
  { id: "電気", label: "電気", color: "bg-orange-500" },
  { id: "フェンス", label: "フェンス", color: "bg-cyan-500" },
  { id: "完工写真", label: "完工写真", color: "bg-green-500" },
] as const;

export type PhotoCategory = typeof PHOTO_CATEGORIES[number];
