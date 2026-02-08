/**
 * モバイルAPI用のJWT認証
 *
 * LINE認証後にJWTトークンを発行し、モバイルアプリからのリクエスト認証に使用
 */

// 本番環境では jose ライブラリの使用を推奨
// ここではシンプルな実装例を示す

interface JwtPayload {
  sub: string; // ユーザーID
  lineUserId?: string;
  name?: string;
  role?: string;
  iat: number; // 発行時刻
  exp: number; // 有効期限
}

// JWT の秘密鍵（本番では環境変数から取得）
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const JWT_EXPIRES_IN = 24 * 60 * 60; // 24時間（秒）

/**
 * Base64 URL Safe エンコード
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Base64 URL Safe デコード
 */
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString("utf8");
}

/**
 * HMAC-SHA256 署名を生成
 */
async function createSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * JWTトークンを発行
 */
export async function signJwt(payload: Omit<JwtPayload, "iat" | "exp">): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRES_IN,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = await createSignature(`${headerB64}.${payloadB64}`, JWT_SECRET);

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * JWTトークンを検証
 */
export async function verifyJwt(token: string): Promise<{
  valid: boolean;
  payload?: JwtPayload;
  error?: string;
}> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "Invalid token format" };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // 署名を検証
    const expectedSignature = await createSignature(`${headerB64}.${payloadB64}`, JWT_SECRET);
    if (signatureB64 !== expectedSignature) {
      return { valid: false, error: "Invalid signature" };
    }

    // ペイロードをデコード
    const payload: JwtPayload = JSON.parse(base64UrlDecode(payloadB64));

    // 有効期限を確認
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: "Token verification failed" };
  }
}

/**
 * Authorizationヘッダーからトークンを抽出
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * リクエストからJWTペイロードを取得
 */
export async function getJwtPayloadFromRequest(request: Request): Promise<{
  authenticated: boolean;
  payload?: JwtPayload;
  error?: string;
}> {
  const authHeader = request.headers.get("Authorization");
  const token = extractToken(authHeader);

  if (!token) {
    return { authenticated: false, error: "No token provided" };
  }

  const result = await verifyJwt(token);

  if (!result.valid) {
    return { authenticated: false, error: result.error };
  }

  return { authenticated: true, payload: result.payload };
}
