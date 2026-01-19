import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";

// 全件取得
export async function GET() {
  const allProjects = await db.select().from(projects);
  return NextResponse.json(allProjects);
}

// 新規追加
export async function POST(request: Request) {
  const body = await request.json();
  const [result] = await db.insert(projects).values(body).returning();
  return NextResponse.json(result);
}
