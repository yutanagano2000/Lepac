import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, todos, meetings } from "@/db/schema";
import { like, or, asc, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json([]);
  }

  const searchPattern = `%${query}%`;

  // 案件を検索（管理番号、販売先、担当、現地住所、案件番号、地権者）
  const projectResults = await db
    .select()
    .from(projects)
    .where(
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
    .orderBy(asc(projects.managementNumber))
    .limit(10);

  // TODOを検索
  const todoResults = await db
    .select()
    .from(todos)
    .where(like(todos.content, searchPattern))
    .orderBy(asc(todos.dueDate))
    .limit(10);

  // 会議を検索（タイトル、内容、議題）
  const meetingResults = await db
    .select()
    .from(meetings)
    .where(
      or(
        like(meetings.title, searchPattern),
        like(meetings.content, searchPattern),
        like(meetings.agenda, searchPattern)
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
