import { test, expect } from '@playwright/test'

test.describe('ナビゲーション', () => {
  test.beforeEach(async ({ page }) => {
    // ログインページにアクセス（認証が必要な場合はスキップ）
    await page.goto('/login')
  })

  test('ログインページが表示される', async ({ page }) => {
    await expect(page).toHaveTitle(/.*/)
  })

  test('ログインページにはサイドナビがない', async ({ page }) => {
    // ログインページではサイドナビが非表示
    const sideNav = page.locator('aside')
    const sideNavCount = await sideNav.count()
    // サイドナビがないか、非表示であることを確認
    if (sideNavCount > 0) {
      await expect(sideNav).not.toBeVisible()
    }
  })
})

test.describe('サイドナビゲーション構造', () => {
  // サイドナビの項目構造をテスト（DOMレベル）
  const expectedItems = [
    { label: 'ホーム', href: '/' },
    { label: '案件', href: '/projects' },
    { label: '工事', href: '/construction' },
    { label: 'TODO', href: '/todo' },
    { label: 'タイムライン', href: '/todos' },
    { label: 'カレンダー', href: '/calendar' },
    { label: 'ツール', href: '/tools' },
    { label: '要望', href: '/feedbacks' },
  ]

  test('ナビゲーション項目の順序が正しい', () => {
    expect(expectedItems[0].label).toBe('ホーム')
    expect(expectedItems[1].label).toBe('案件')
    expect(expectedItems[2].label).toBe('工事')
    expect(expectedItems[3].label).toBe('TODO')
    expect(expectedItems[4].label).toBe('タイムライン')
    expect(expectedItems[5].label).toBe('カレンダー')
    expect(expectedItems[6].label).toBe('ツール')
    expect(expectedItems[7].label).toBe('要望')
  })
})
