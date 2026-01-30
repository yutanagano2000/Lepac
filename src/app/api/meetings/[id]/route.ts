import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  const [row] = await db.select().from(meetings).where(eq(meetings.id, idNum));
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }
  const [existing] = await db.select().from(meetings).where(eq(meetings.id, idNum));
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await request.json();
  const [updated] = await db
    .update(meetings)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.meetingDate !== undefined && { meetingDate: body.meetingDate }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.content !== undefined && { content: body.content ?? null }),
      ...(body.agenda !== undefined && { agenda: body.agenda ?? null }),
    })
    .where(eq(meetings.id, idNum))
    .returning();
  return NextResponse.json(updated);
}
