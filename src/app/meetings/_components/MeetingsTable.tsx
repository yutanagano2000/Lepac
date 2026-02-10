"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Meeting } from "@/db/schema";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface MeetingsTableProps {
  meetings: Meeting[];
  searchQuery: string;
}

function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return format(d, "yyyy年M月d日", { locale: ja });
}

export function MeetingsTable({ meetings, searchQuery }: MeetingsTableProps) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <Table className="min-w-[500px]">
        <TableHeader>
          <TableRow>
            <TableHead>タイトル</TableHead>
            <TableHead>日付</TableHead>
            <TableHead>種別</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {meetings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {searchQuery ? "検索結果がありません" : "議事録がありません"}
              </TableCell>
            </TableRow>
          ) : (
            meetings.map((meeting) => (
              <TableRow
                key={meeting.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/meetings/${meeting.id}`)}
              >
                <TableCell className="font-medium">{meeting.title}</TableCell>
                <TableCell>{formatDisplayDate(meeting.meetingDate)}</TableCell>
                <TableCell>{meeting.category}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
