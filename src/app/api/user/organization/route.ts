import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// ログインユーザーの所属組織を更新
export async function PUT(request: Request) {
  try {
    const session = await auth();
    console.log("[Organization API] Session:", session?.user?.id);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const organizationId = body.organizationId;
    console.log("[Organization API] organizationId:", organizationId);

    if (typeof organizationId !== "number") {
      return NextResponse.json(
        { error: "organizationId must be a number" },
        { status: 400 }
      );
    }

    // 組織の存在確認
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    console.log("[Organization API] Found org:", org);

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // ユーザーの組織IDを更新
    const userId = parseInt(session.user.id);
    console.log("[Organization API] Updating user:", userId);

    await db
      .update(users)
      .set({ organizationId })
      .where(eq(users.id, userId));

    console.log("[Organization API] Update successful");
    return NextResponse.json({ success: true, organizationId });
  } catch (error) {
    console.error("[Organization API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
