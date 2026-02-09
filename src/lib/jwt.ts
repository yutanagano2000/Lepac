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

/** JWT設定が正しいかを検証 */
function validateJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("[JWT] JWT_SECRET 環境変数が設定されていません");
  }

  // 本番環境での最低限のセキュリティチェック
  if (process.env.NODE_ENV === "production") {
    if (secret.length < 32) {
      throw new Error("[JWT] JWT_SECRET は本番環境では最低32文字必要です");
    }
    if (secret.includes("your-") || secret.includes("change-in-production")) {
      throw new Error("[JWT] デフォルトのシークレットキーは本番環境で使用できません");
    }
  }

  return new TextEncoder().encode(secret);
}

// JWT 設定（遅延初期化）
let _jwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (!_jwtSecret) {
    _jwtSecret = validateJwtSecret();
  }
  return _jwtSecret;
}

const JWT_ISSUER = "lepac";
const JWT_AUDIENCE = "vantage-mobile";
const JWT_EXPIRES_IN = "7d"; // 7日間有効

/** モバイルトークン発行用ペイロード */
export interface SignMobileTokenPayload {
  userId: number;
  username: string;
  organizationId: number | null;
  role: string;
}

/**
 * モバイル用 JWT を発行
 * @param payload - ユーザー情報
 * @returns JWT文字列
 * @throws JWT_SECRET未設定または不正な場合
 */
export async function signMobileToken(payload: SignMobileTokenPayload): Promise<string> {
  // 入力検証
  if (!Number.isInteger(payload.userId) || payload.userId <= 0) {
    throw new Error("[JWT] userId は正の整数である必要があります");
  }
  if (typeof payload.username !== "string" || payload.username.trim() === "") {
    throw new Error("[JWT] username は空でない文字列である必要があります");
  }
  if (typeof payload.role !== "string" || payload.role.trim() === "") {
    throw new Error("[JWT] role は空でない文字列である必要があります");
  }

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
    .sign(getJwtSecret());

  return token;
}

/**
 * ペイロードが有効な MobileTokenPayload かどうかを検証
 */
function isValidMobileTokenPayload(payload: JWTPayload): payload is MobileTokenPayload {
  return (
    typeof payload.userId === "number" &&
    Number.isInteger(payload.userId) &&
    payload.userId > 0 &&
    typeof payload.username === "string" &&
    typeof payload.role === "string" &&
    (payload.organizationId === null || (typeof payload.organizationId === "number" && Number.isInteger(payload.organizationId)))
  );
}

/**
 * JWT を検証してペイロードを取得
 * @param token - JWT文字列
 * @returns 検証成功時はペイロード、失敗時はnull
 */
export async function verifyMobileToken(
  token: string
): Promise<MobileTokenPayload | null> {
  if (typeof token !== "string" || token.trim() === "") {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // 型検証
    if (!isValidMobileTokenPayload(payload)) {
      console.error("[JWT] Invalid payload structure");
      return null;
    }

    return payload;
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
