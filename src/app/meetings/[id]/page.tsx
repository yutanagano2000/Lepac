import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { MeetingMinutesSection } from "./MeetingMinutesSection";

interface MeetingDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  const { id } = await params;
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) notFound();

  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, idNum));
  if (!meeting) notFound();

  const displayDate = meeting.meetingDate
    ? format(new Date(meeting.meetingDate + "T00:00:00"), "yyyy年M月d日", { locale: ja })
    : "-";

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <div className="mx-auto max-w-4xl py-6 sm:py-10">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" asChild>
              <Link href="/meetings">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold truncate">{meeting.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {displayDate} ／ {meeting.category}
              </p>
            </div>
          </div>

          <MeetingMinutesSection meetingId={meeting.id} initialContent={meeting.content} />
        </div>
      </div>
    </div>
  );
}
