/**
 * JWT ユーティリティ
 * モバイルアプリ（Vantage）向けのトークン発行・検証
 */

import { SignJWT, jwtVerify, JWTPayload } from "jose";

// JWT ペイロード型
export interface MobileTokenPayload extends JWTPayload {
  userId: number;
  username: string;
  organizationId: number | null;
  role: string;
}

// JWT 設定
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production"
);
const JWT_ISSUER = "lepac";
const JWT_AUDIENCE = "vantage-mobile";
const JWT_EXPIRES_IN = "7d"; // 7日間有効

/**
 * モバイル用 JWT を発行
 */
export async function signMobileToken(payload: {
  userId: number;
  username: string;
  organizationId: number | null;
  role: string;
}): Promise<string> {
  const token = await new SignJWT({
    userId: payload.userId,
    username: payload.username,
    organizationId: payload.organizationId,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);

  return token;
}

/**
 * JWT を検証してペイロードを取得
 */
export async function verifyMobileToken(
  token: string
): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return payload as MobileTokenPayload;
  } catch (error) {
    console.error("[JWT] Verification failed:", error);
    return null;
  }
}

/**
 * Authorization ヘッダーからトークンを抽出
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * リクエストから認証情報を取得
 */
export async function getMobileAuthFromRequest(
  request: Request
): Promise<MobileTokenPayload | null> {
  const authHeader = request.headers.get("Authorization");
  const token = extractBearerToken(authHeader);

  if (!token) {
    return null;
  }

  return verifyMobileToken(token);
}
