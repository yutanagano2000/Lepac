/**
 * モバイル 組織一覧 API
 * GET /api/mobile/organizations
 *
 * 利用可能な組織一覧を取得
 *
 * セキュリティ対策:
 * - JWT認証必須
 * - レート制限（DoS対策）
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getMobileAuthFromRequest } from "@/lib/jwt";
import { rateLimitGuard } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // レート制限チェック（認証済みAPIはstrictモード）
  const rateLimitError = await rateLimitGuard(request, "mobile-organizations", "strict");
  if (rateLimitError) {
    return rateLimitError;
  }

  try {
    // JWT認証チェック
    const auth = await getMobileAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 全組織を取得
    const allOrganizations = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        code: organizations.code,
      })
      .from(organizations)
      .orderBy(organizations.name);

    return NextResponse.json({
      organizations: allOrganizations,
    });
  } catch (error) {
    // エラーログには詳細を記録するが、クライアントには一般的なメッセージのみ返す
    console.error("[Organizations API] Error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}
