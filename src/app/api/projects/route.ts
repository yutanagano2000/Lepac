import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";

// 全件取得
export async function GET() {
  const allProjects = db.select().from(projects).all();
  return NextResponse.json(allProjects);
}

// 新規追加
export async function POST(request: Request) {
  const body = await request.json();
  const result = db.insert(projects).values(body).returning().get();
  return NextResponse.json(result);
}
