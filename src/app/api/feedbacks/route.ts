import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { createFeedbackSchema, validateBody } from "@/lib/validations";
import { requireOrganization, requireOrganizationWithCsrf, getUserId } from "@/lib/auth-guard";
import { logFeedbackCreate } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// 要望一覧取得
export async function GET() {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const allFeedbacks = await db
    .select()
    .from(feedbacks)
    .where(eq(feedbacks.organizationId, organizationId))
    .orderBy(desc(feedbacks.createdAt));

  return NextResponse.json(allFeedbacks);
}

// 要望投稿
export async function POST(request: NextRequest) {
  // 認証・組織チェック（CSRF保護付き）
  const authResult = await requireOrganizationWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }
  const { user, organizationId } = authResult;

  const validation = await validateBody(request, createFeedbackSchema);
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { content, pagePath, pageTitle } = validation.data;

  // セッションからユーザー情報を取得
  const userId = getUserId(user);
  const userName = user.name || user.username || null;

  try {
    const [result] = await db
      .insert(feedbacks)
      .values({
        organizationId, // 組織IDを自動設定
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

    // 監査ログ記録
    await logFeedbackCreate(user, result.id, content, request);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // セキュリティ: スタックトレースや内部詳細を漏洩させない
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to create feedback:", errorMessage);
    return NextResponse.json({ error: "要望の投稿に失敗しました" }, { status: 500 });
  }
}
