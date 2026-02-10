import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { requireAuthWithCsrf } from "@/lib/auth-guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateOrganizationSchema = z.object({
  organizationId: z.number().int().positive(),
});

// ログインユーザーの所属組織を更新
export async function PUT(request: NextRequest) {
  // CSRF保護付き認証チェック
  const authResult = await requireAuthWithCsrf(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { user } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = updateOrganizationSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({
      error: "Validation failed",
      details: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    }, { status: 400 });
  }

  const { organizationId } = validation.data;
  const userId = parseInt(user.id, 10);

  try {
    // 組織の存在確認
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // ユーザーがこの組織に所属しているか確認（権限チェック）
    const [membership] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, organizationId)
        )
      );

    // 既に所属している場合のみ切り替えを許可
    // 新規所属の場合は管理者による招待フローが必要
    if (!membership) {
      // 管理者ユーザーは任意の組織に切り替え可能
      if (user.role !== "admin") {
        return NextResponse.json(
          { error: "この組織へのアクセス権がありません" },
          { status: 403 }
        );
      }
    }

    // 組織変更の監査ログ（セキュリティ監視用）
    console.log(
      `[AUDIT] User ${userId} changing organization: ${user.organizationId ?? "none"} -> ${organizationId}`
    );

    // ユーザーの組織IDを更新
    await db
      .update(users)
      .set({ organizationId })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true, organizationId });
  } catch (error) {
    console.error("Failed to update organization:", error);
    return NextResponse.json({ error: "組織の更新に失敗しました" }, { status: 500 });
  }
}
