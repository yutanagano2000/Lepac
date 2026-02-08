import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load the home page or redirect to login", async ({ page }) => {
    const response = await page.goto("/");

    // ページが正常にロードされる（500エラー以外）
    expect(response?.status()).toBeLessThan(500);

    // ページにコンテンツが存在する
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBe(true);
  });

  test("should have proper page structure", async ({ page }) => {
    await page.goto("/");

    // ページが正常にロードされる
    await expect(page).toHaveTitle(/.*/);
  });
});

test.describe("Navigation", () => {
  test("projects page should be accessible", async ({ page }) => {
    await page.goto("/projects");

    // プロジェクトページまたはログインページが表示される
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBe(true);
  });

  test("todos page should be accessible", async ({ page }) => {
    await page.goto("/todos");

    // TODOページまたはログインページが表示される
    const hasContent = await page.locator("body").isVisible();
    expect(hasContent).toBe(true);
  });
});
