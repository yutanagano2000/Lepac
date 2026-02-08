import { NextRequest } from "next/server";

/**
 * NextRequestのモックを作成するヘルパー
 */
export interface MockRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  searchParams?: Record<string, string>;
  cookies?: Record<string, string>;
}

/**
 * テスト用のNextRequestを作成
 */
export function createMockNextRequest(
  url: string,
  options: MockRequestOptions = {}
): NextRequest {
  const {
    method = "GET",
    headers = {},
    body,
    searchParams = {},
    cookies = {},
  } = options;

  // URLにクエリパラメータを追加
  const urlObj = new URL(url, "http://localhost:3000");
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  // ヘッダーを構築
  const requestHeaders = new Headers(headers);

  // Cookie ヘッダーを追加
  if (Object.keys(cookies).length > 0) {
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
    requestHeaders.set("Cookie", cookieString);
  }

  // Content-Type を設定（POSTの場合）
  if (body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  // Origin/Referer を設定（CSRFテスト用）
  if (!requestHeaders.has("Origin")) {
    requestHeaders.set("Origin", "http://localhost:3000");
  }

  // NextRequest を作成
  const request = new NextRequest(urlObj.toString(), {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  return request;
}

/**
 * CSRFテスト用のリクエストを作成（不正なOrigin）
 */
export function createCsrfAttackRequest(
  url: string,
  options: MockRequestOptions = {}
): NextRequest {
  return createMockNextRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      Origin: "https://malicious-site.com",
      Referer: "https://malicious-site.com/attack",
    },
  });
}

/**
 * 認証済みリクエストを作成（JWTトークン付き）
 */
export function createAuthenticatedRequest(
  url: string,
  token: string,
  options: MockRequestOptions = {}
): NextRequest {
  return createMockNextRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * モバイルAPIリクエストを作成
 */
export function createMobileApiRequest(
  url: string,
  token: string,
  options: MockRequestOptions = {}
): NextRequest {
  return createMockNextRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "X-Mobile-Client": "lepac-mobile/1.0.0",
    },
  });
}
