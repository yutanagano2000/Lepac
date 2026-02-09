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

  try {
    // 組織の存在確認
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // ユーザーの組織IDを更新
    const userId = parseInt(session.user.id, 10);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    await db
      .update(users)
      .set({ organizationId })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true, organizationId });
  } catch {
    return NextResponse.json({ error: "組織の更新に失敗しました" }, { status: 500 });
  }
}
