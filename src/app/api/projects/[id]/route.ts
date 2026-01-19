import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, progress, comments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [project] = await db.select().from(projects).where(eq(projects.id, Number(id)));
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const [result] = await db
    .update(projects)
    .set({
      managementNumber: body.managementNumber,
      manager: body.manager,
      client: body.client,
      projectNumber: body.projectNumber,
      completionMonth: body.completionMonth || null,
    })
    .where(eq(projects.id, Number(id)))
    .returning();
  return NextResponse.json(result);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);

  // 関連するコメントを先に削除
  await db.delete(comments).where(eq(comments.projectId, projectId));

  // 関連する進捗を削除
  await db.delete(progress).where(eq(progress.projectId, projectId));

  // 案件を削除
  await db.delete(projects).where(eq(projects.id, projectId));

  return NextResponse.json({ success: true });
}
