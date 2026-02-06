import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.GEO_CHECKER_BACKEND_URL ||
  "https://geo-checker-backend-aj4j.onrender.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/v1/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Legal check proxy error:", error);
    return NextResponse.json(
      { error: "法令チェックバックエンドへの接続に失敗しました" },
      { status: 502 }
    );
  }
}
