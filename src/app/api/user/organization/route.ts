import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { auth } from "@/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateOrganizationSchema = z.object({
  organizationId: z.number().int().positive(),
});

// ログインユーザーの所属組織を更新
export async function PUT(request: Request) {
  const session = await auth();
  console.log("[Organization API] Session:", session?.user?.id);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  console.log("[Organization API] organizationId:", organizationId);

  try {
    // 組織の存在確認
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    console.log("[Organization API] Found org:", org);

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
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
    return NextResponse.json({ error: "組織の更新に失敗しました" }, { status: 500 });
  }
}
