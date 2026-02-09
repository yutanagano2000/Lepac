import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { requireOrganizationWithCsrf } from "@/lib/auth-guard";
import { createErrorResponse } from "@/lib/api-error";
import { parseValidId } from "@/lib/validation";

export const dynamic = "force-dynamic";

// いいねを追加
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証・組織チェック（CSRF保護付き）
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const { id } = await params;

  // 共通ヘルパーでID検証
  const feedbackId = parseValidId(id);
  if (feedbackId === null) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    // 組織に属するフィードバックのみ更新可能
    // COALESCE で NULL を 0 として扱い、NULL + 1 = NULL を防止
    const [result] = await db
      .update(feedbacks)
      .set({
        likes: sql`COALESCE(${feedbacks.likes}, 0) + 1`,
      })
      .where(
        and(
          eq(feedbacks.id, feedbackId),
          eq(feedbacks.organizationId, organizationId)
        )
      )
      .returning({
        id: feedbacks.id,
        likes: feedbacks.likes,
      });

    if (!result) {
      return NextResponse.json({ error: "フィードバックが見つかりません" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return createErrorResponse(error, "いいねの追加に失敗しました");
  }
}
