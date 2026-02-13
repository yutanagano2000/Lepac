// カレンダーイベントの型定義
export interface CalendarEventData {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    type: "todo" | "progress" | "meeting" | "custom" | "other";
    projectId?: number;
    projectName?: string;
    description?: string;
    status?: string;
    userName?: string | null;
    category?: string;
    startTime?: string | null;
    endTime?: string | null;
  };
}
