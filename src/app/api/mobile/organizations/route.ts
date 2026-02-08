/**
 * モバイル 組織一覧 API
 * GET /api/mobile/organizations
 *
 * 利用可能な組織一覧を取得
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getMobileAuthFromRequest } from "@/lib/jwt";

export async function GET(request: NextRequest) {
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
    console.error("[Organizations API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
