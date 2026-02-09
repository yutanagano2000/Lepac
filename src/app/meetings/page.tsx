import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { auth } from "@/auth";
import MeetingsView from "./MeetingsView";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  // 認証チェック
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const organizationId = session.user.organizationId;
  if (!organizationId) {
    redirect("/login");
  }

  // 組織IDでフィルタリング
  const list = await db
    .select()
    .from(meetings)
    .where(eq(meetings.organizationId, organizationId))
    .orderBy(desc(meetings.meetingDate));

  return <MeetingsView initialMeetings={list} />;
}
