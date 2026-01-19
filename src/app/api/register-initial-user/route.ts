import { NextResponse } from "next/server";
import { db, initDb } from "@/db";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";

export async function GET() {
  await initDb();
  // すでにユーザーがいるか確認
  const existingUsers = await db.select().from(users);
  
  if (existingUsers.length > 0) {
    return NextResponse.json({ error: "User already exists" }, { status: 400 });
  }

  // 初期ユーザーの作成
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const [newUser] = await db
    .insert(users)
    .values({
      username: "admin",
      name: "管理者",
      password: hashedPassword,
      role: "admin",
    })
    .returning();

  return NextResponse.json({
    message: "Initial user created",
    username: newUser.username,
    password: "admin123 (Please change this immediately)"
  });
}
