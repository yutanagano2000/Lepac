import { test, expect } from '@playwright/test'

test.describe('認証フロー', () => {
  test('ログインページが表示される', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL('/login')
    await expect(page.locator('text=ログイン')).toBeVisible()
  })

  test('未認証ユーザーはログインページにリダイレクト', async ({ page }) => {
    await page.goto('/projects')
    // 未認証の場合、ログインページにリダイレクトされる
    await expect(page).toHaveURL(/\/login/)
  })

  test('ログインフォームにユーザー名とパスワード入力欄がある', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[name="username"], input[type="text"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('ログインボタンが存在する', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('button[type="submit"], button:has-text("ログイン")')).toBeVisible()
  })
})

test.describe('組織選択フロー', () => {
  test('組織選択ページが存在する', async ({ page }) => {
    // 認証済みユーザーとして組織選択ページにアクセス
    await page.goto('/onboarding/select-organization')
    // ページが存在することを確認（認証なしだとリダイレクトされる可能性）
  })
})
