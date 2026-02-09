import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/db";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";

// 初期ユーザー登録API
// セキュリティ: 環境変数でのシークレットキー必須、本番環境では無効化推奨
export async function POST(request: NextRequest) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_INITIAL_USER_REGISTRATION) {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { setupKey, username, password, name } = body;

    // セットアップキーの検証（環境変数で設定必須）
    // タイミング攻撃対策: 常に同じ時間で比較
    const expectedKey = process.env.INITIAL_SETUP_KEY;
    if (!expectedKey) {
      return NextResponse.json({ error: "Setup key not configured" }, { status: 500 });
    }
    if (typeof setupKey !== "string" || setupKey.length === 0) {
      return NextResponse.json({ error: "Invalid setup key" }, { status: 401 });
    }
    // 長さを揃えて比較（タイミング攻撃対策）
    const keyBuffer = Buffer.from(setupKey.padEnd(64, "\0"));
    const expectedBuffer = Buffer.from(expectedKey.padEnd(64, "\0"));
    if (!timingSafeEqual(keyBuffer, expectedBuffer)) {
      return NextResponse.json({ error: "Invalid setup key" }, { status: 401 });
    }

    // 入力バリデーション
    if (!username || typeof username !== "string" || username.length < 3 || username.length > 50) {
      return NextResponse.json({ error: "Invalid username (3-50 characters required)" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    await initDb();

    // すでにユーザーがいるか確認
    const existingUsers = await db.select().from(users);

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: "Users already exist" }, { status: 400 });
    }

    // ユーザーの作成（パスワードはリクエストから取得）
    const hashedPassword = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        username: username.trim(),
        name: name?.trim() || "管理者",
        password: hashedPassword,
        role: "admin",
      })
      .returning({ id: users.id, username: users.username, name: users.name });

    return NextResponse.json({
      message: "Initial user created successfully",
      user: { id: newUser.id, username: newUser.username, name: newUser.name }
    }, { status: 201 });
  } catch (error) {
    console.error("Initial user registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
