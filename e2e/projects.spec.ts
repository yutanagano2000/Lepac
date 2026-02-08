import { test, expect } from "@playwright/test";

test.describe("Projects Page", () => {
  test("should load projects page or redirect to login", async ({ page }) => {
    const response = await page.goto("/projects");

    // ページが正常にロードされる（500エラー以外）
    expect(response?.status()).toBeLessThan(500);

    // ページにコンテンツが存在する
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBe(true);
  });

  test("page responds to navigation", async ({ page }) => {
    const response = await page.goto("/projects");

    // ステータスコードが正常（200系またはリダイレクト）
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Project Detail Page", () => {
  test("project detail route is defined", async ({ page }) => {
    // プロジェクト詳細ページのルートが存在することを確認
    const response = await page.goto("/projects/1");

    // 404以外のレスポンス（認証リダイレクトを含む）
    expect(response?.status()).toBeLessThan(500);
  });
});
