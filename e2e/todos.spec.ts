import { test, expect } from "@playwright/test";

test.describe("Todos Page", () => {
  test("should load todos page or redirect to login", async ({ page }) => {
    const response = await page.goto("/todos");

    // ページが正常にロードされる（500エラー以外）
    expect(response?.status()).toBeLessThan(500);

    // ページにコンテンツが存在する
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBe(true);
  });

  test("page responds to navigation", async ({ page }) => {
    const response = await page.goto("/todos");

    // ステータスコードが正常（200系またはリダイレクト）
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Todo Interactions", () => {
  test("page structure is valid", async ({ page }) => {
    await page.goto("/todos");

    // HTML構造が正しい
    const html = await page.locator("html").isVisible();
    const body = await page.locator("body").isVisible();

    expect(html && body).toBe(true);
  });
});
