import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { todos, projects } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: todos.id,
      projectId: todos.projectId,
      content: todos.content,
      dueDate: todos.dueDate,
      createdAt: todos.createdAt,
      completedAt: todos.completedAt,
      completedMemo: todos.completedMemo,
      managementNumber: projects.managementNumber,
    })
    .from(todos)
    .leftJoin(projects, eq(todos.projectId, projects.id))
    .orderBy(asc(todos.dueDate));
  return NextResponse.json(rows);
}
