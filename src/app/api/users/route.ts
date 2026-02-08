import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireOrganization } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/users
 * 同じ組織に属するユーザー一覧を取得
 */
export async function GET() {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
    })
    .from(users)
    .where(eq(users.organizationId, organizationId));

  return NextResponse.json(rows);
}
