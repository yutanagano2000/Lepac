// イベントタイプのオプション
export const EVENT_TYPE_OPTIONS = [
  { value: "todo", label: "TODO", color: "bg-amber-500" },
  { value: "meeting", label: "会議", color: "bg-purple-500" },
  { value: "other", label: "その他", color: "bg-zinc-500" },
] as const;

// イベントカラー
export const getEventColor = (type: string, status?: string) => {
  switch (type) {
    case "todo":
      if (status === "completed") return { bg: "#22c55e", border: "#16a34a", text: "#ffffff" };
      return { bg: "#f59e0b", border: "#d97706", text: "#ffffff" };
    case "progress":
      if (status === "completed") return { bg: "#22c55e", border: "#16a34a", text: "#ffffff" };
      return { bg: "#3b82f6", border: "#2563eb", text: "#ffffff" };
    case "meeting":
      return { bg: "#8b5cf6", border: "#7c3aed", text: "#ffffff" };
    case "other":
    case "custom":
    default:
      return { bg: "#71717a", border: "#52525b", text: "#ffffff" };
  }
};
