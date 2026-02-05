import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, todos, meetings } from "@/db/schema";
import { like, or, asc, desc, and, eq } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // 認証・組織チェック
  const authResult = await requireOrganization();
  if (!authResult.success) {
    return authResult.response;
  }
  const { organizationId } = authResult;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json([]);
  }

  const searchPattern = `%${query}%`;

  // 案件を検索（組織フィルタリング）
  const projectResults = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        or(
          like(projects.managementNumber, searchPattern),
          like(projects.client, searchPattern),
          like(projects.manager, searchPattern),
          like(projects.address, searchPattern),
          like(projects.projectNumber, searchPattern),
          like(projects.landowner1, searchPattern),
          like(projects.landowner2, searchPattern),
          like(projects.landowner3, searchPattern)
        )
      )
    )
    .orderBy(asc(projects.managementNumber))
    .limit(10);

  // TODOを検索（組織フィルタリング）
  const todoResults = await db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.organizationId, organizationId),
        like(todos.content, searchPattern)
      )
    )
    .orderBy(asc(todos.dueDate))
    .limit(10);

  // 会議を検索（組織フィルタリング）
  const meetingResults = await db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.organizationId, organizationId),
        or(
          like(meetings.title, searchPattern),
          like(meetings.content, searchPattern),
          like(meetings.agenda, searchPattern)
        )
      )
    )
    .orderBy(desc(meetings.meetingDate))
    .limit(10);

  // 結果を統合
  const results = [
    ...projectResults.map((p) => ({
      type: "project" as const,
      id: p.id,
      title: p.managementNumber,
      subtitle: p.client,
      href: `/projects/${p.id}`,
    })),
    ...todoResults.map((t) => ({
      type: "todo" as const,
      id: t.id,
      title: t.content,
      subtitle: t.dueDate,
      href: t.projectId ? `/projects/${t.projectId}` : "/todo",
    })),
    ...meetingResults.map((m) => ({
      type: "meeting" as const,
      id: m.id,
      title: m.title,
      subtitle: `${m.meetingDate} - ${m.category}`,
      href: `/meetings/${m.id}`,
    })),
  ];

  return NextResponse.json(results);
}
