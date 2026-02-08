import type { DueDateInfo } from "./_types";

export function getDueDateInfo(dueDateStr: string): DueDateInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return { group: "overdue", label: `${Math.abs(diffDays)}日超過`, diffDays };
  if (diffDays === 0) return { group: "today", label: "今日", diffDays };
  if (diffDays === 1) return { group: "upcoming", label: "明日", diffDays };
  if (diffDays <= 3)
    return { group: "upcoming", label: `あと${diffDays}日`, diffDays };
  return { group: "later", label: `あと${diffDays}日`, diffDays };
}
