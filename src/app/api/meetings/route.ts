import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { meetings } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = await db.select().from(meetings).orderBy(desc(meetings.meetingDate));
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  const body = await request.json();
  const [result] = await db
    .insert(meetings)
    .values({
      title: body.title ?? "",
      meetingDate: body.meetingDate ?? "",
      category: body.category ?? "社内",
      content: body.content ?? null,
      agenda: body.agenda ?? null,
    })
    .returning();
  return NextResponse.json(result);
}
