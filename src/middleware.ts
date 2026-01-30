import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 許可するIPアドレスのリスト（環境変数から読み込み + ローカル開発用 + 固定許可）
const ALLOWED_IPS = [
  ...(process.env.ALLOWED_IPS?.split(",").map((ip) => ip.trim()) || []),
  "127.0.0.1",
  "::1",
  "153.175.16.12",
];

function getClientIp(request: NextRequest): string | null {
  // Vercel/Cloudflareなどのプロキシ経由の場合
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // 直接接続の場合
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return null;
}

const authMiddleware = NextAuth(authConfig).auth;

export default async function middleware(request: NextRequest) {
  const clientIp = getClientIp(request);

  // ローカル開発時はIP制限をスキップ
  const isLocalDev = process.env.NODE_ENV === "development";

  // IP制限チェック
  if (!isLocalDev && clientIp && !ALLOWED_IPS.includes(clientIp)) {
    console.log(`Access denied for IP: ${clientIp}`);
    return new NextResponse("Access Denied", { status: 403 });
  }

  // 既存のNextAuth認証処理
  // @ts-expect-error NextAuth middleware type compatibility
  return authMiddleware(request);
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
