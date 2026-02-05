import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { createMeetingSchema, validateBody } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = await db.select().from(meetings).orderBy(desc(meetings.meetingDate));
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  const validation = await validateBody(request, createMeetingSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { title, meetingDate, category, content, agenda } = validation.data;

  try {
    const [result] = await db
      .insert(meetings)
      .values({
        title,
        meetingDate,
        category,
        content: content ?? null,
        agenda: agenda ?? null,
      })
      .returning();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create meeting:", error);
    return NextResponse.json({ error: "会議の作成に失敗しました" }, { status: 500 });
  }
}
