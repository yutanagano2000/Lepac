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
  "1.73.154.231",
  "210.155.18.80",
];

// IP制限を有効にするかどうか（環境変数で制御）
const IP_RESTRICTION_ENABLED = process.env.IP_RESTRICTION_ENABLED === "true";

function getClientIp(request: NextRequest): string | null {
  // Vercel が設定する信頼済みヘッダーを最優先（偽装不可）
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return vercelIp.split(",")[0].trim();
  }

  // Cloudflare が設定する信頼済みヘッダー
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }

  // フォールバック: x-forwarded-for（信頼できるプロキシ環境でのみ有効）
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

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

  // IP制限チェック（環境変数で有効化を制御）
  if (IP_RESTRICTION_ENABLED && !isLocalDev && clientIp && !ALLOWED_IPS.includes(clientIp)) {
    console.log(`[Security] Access denied for IP: ${clientIp}`);
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
