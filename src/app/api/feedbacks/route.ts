import { NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// 要望一覧取得
export async function GET() {
  const allFeedbacks = await db
    .select()
    .from(feedbacks)
    .orderBy(desc(feedbacks.createdAt));

  return NextResponse.json(allFeedbacks);
}

// 要望投稿
export async function POST(request: Request) {
  const body = await request.json();
  const { content, pagePath, pageTitle } = body;

  if (!content || !pagePath) {
    return NextResponse.json(
      { error: "Content and pagePath are required" },
      { status: 400 }
    );
  }

  const [result] = await db
    .insert(feedbacks)
    .values({
      content,
      pagePath,
      pageTitle: pageTitle || null,
      status: "pending",
      likes: 0,
      createdAt: new Date().toISOString(),
    })
    .returning();

  return NextResponse.json(result);
}
