import { NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// いいねを追加
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const { id } = await params;
  const feedbackId = Number(id);

  if (isNaN(feedbackId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // 組織に属するフィードバックのみ更新可能
  const [result] = await db
    .update(feedbacks)
    .set({
      likes: sql`${feedbacks.likes} + 1`,
    })
    .where(
      and(
        eq(feedbacks.id, feedbackId),
        eq(feedbacks.organizationId, organizationId)
      )
    )
    .returning();

  if (!result) {
    return NextResponse.json({ error: "フィードバックが見つかりません" }, { status: 404 });
  }

  return NextResponse.json(result);
}
