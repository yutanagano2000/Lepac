import { NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks } from "@/db/schema";
import { desc } from "drizzle-orm";
import { auth } from "@/auth";
import { createFeedbackSchema, validateBody } from "@/lib/validations";

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
  const validation = await validateBody(request, createFeedbackSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const session = await auth();
  const { content, pagePath, pageTitle } = validation.data;

  // セッションからユーザー情報を取得
  const userId = session?.user?.id ? parseInt(session.user.id) : null;
  const user = session?.user as { name?: string; username?: string } | undefined;
  const userName = user?.name || user?.username || null;

  try {
    const [result] = await db
      .insert(feedbacks)
      .values({
        content,
        pagePath,
        pageTitle: pageTitle || null,
        status: "pending",
        likes: 0,
        createdAt: new Date().toISOString(),
        userId,
        userName,
      })
      .returning();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create feedback:", error);
    return NextResponse.json({ error: "要望の投稿に失敗しました" }, { status: 500 });
  }
}
