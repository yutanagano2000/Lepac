import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * 認証済み状態でテストを実行するためのフィクスチャ
 */

// テスト用のユーザー情報
export const testUser = {
  username: "testuser",
  password: "password123",
};

export const adminUser = {
  username: "admin",
  password: "admin123",
};

// 認証済みページを提供するフィクスチャ
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    // ログインページにアクセス
    await page.goto("/login");

    // ログインフォームに入力
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);

    // ログインボタンをクリック
    await page.click('button[type="submit"]');

    // ダッシュボードにリダイレクトされるのを待つ
    await page.waitForURL("/", { timeout: 10000 });

    // 認証済みページを提供
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    // 管理者としてログイン
    await page.goto("/login");
    await page.fill('input[name="username"]', adminUser.username);
    await page.fill('input[name="password"]', adminUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 10000 });
    await use(page);
  },
});

/**
 * セッションCookieを直接設定してログイン状態を模擬
 * （高速なテスト用）
 */
export async function setupAuthCookies(page: Page, userId: string = "1") {
  // next-authのセッションCookieを設定
  // 注意: 実際の環境では暗号化されたトークンが必要
  await page.context().addCookies([
    {
      name: "authjs.session-token",
      value: `test-session-token-${userId}`,
      domain: "localhost",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24時間後
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

/**
 * ログアウトを実行
 */
export async function logout(page: Page) {
  // サインアウトAPIを呼び出し
  await page.goto("/api/auth/signout");

  // または、UIからログアウト
  // await page.click('[data-testid="logout-button"]');

  // ログインページにリダイレクトされるのを確認
  await page.waitForURL("/login", { timeout: 5000 });
}

/**
 * 認証が必要なページへのアクセスをテスト
 */
export async function assertAuthRequired(page: Page, url: string) {
  await page.goto(url);
  // 未認証の場合、ログインページにリダイレクトされることを確認
  await expect(page).toHaveURL(/\/login/);
}

export { expect };
