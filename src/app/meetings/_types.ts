import type { Meeting } from "@/db/schema";

export interface MeetingFormData {
  title: string;
  meetingDate: string;
  category: string;
  content: string;
}

export interface MeetingsViewProps {
  initialMeetings: Meeting[];
}

export interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MeetingFormData) => Promise<void>;
  isSubmitting: boolean;
}
