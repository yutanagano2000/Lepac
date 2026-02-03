import { NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// いいねを追加
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const feedbackId = Number(id);

  if (isNaN(feedbackId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const [result] = await db
    .update(feedbacks)
    .set({
      likes: sql`${feedbacks.likes} + 1`,
    })
    .where(eq(feedbacks.id, feedbackId))
    .returning();

  return NextResponse.json(result);
}
