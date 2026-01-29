import { desc } from "drizzle-orm";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import MeetingsView from "./MeetingsView";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const list = await db.select().from(meetings).orderBy(desc(meetings.meetingDate));
  return <MeetingsView initialMeetings={list} />;
}
