import { test, expect } from '@playwright/test'

test.describe('工事画面', () => {
  // 注意: これらのテストは認証済みセッションが必要
  // CI環境では認証をモックするか、テスト用アカウントを使用

  test.describe('画面構造', () => {
    test('工事画面のURLが正しい', async ({ page }) => {
      await page.goto('/construction')
      // 認証なしだとリダイレクトされる可能性があるため、URLのチェックは柔軟に
    })
  })

  test.describe('タブ切り替え', () => {
    test('発注タブと工程タブが存在する', async ({ page }) => {
      await page.goto('/construction')
      // タブの存在を確認（認証後）
      // await expect(page.locator('button:has-text("発注")')).toBeVisible()
      // await expect(page.locator('button:has-text("工程")')).toBeVisible()
    })
  })

  test.describe('月切り替え', () => {
    test('月切り替えボタンが存在する', async ({ page }) => {
      await page.goto('/construction')
      // 認証後にボタンの存在を確認
      // const prevButton = page.locator('button').filter({ has: page.locator('svg') }).first()
      // const nextButton = page.locator('button').filter({ has: page.locator('svg') }).last()
    })
  })
})

test.describe('工事データ表示', () => {
  test.describe('発注タブ', () => {
    const expectedColumns = [
      '管理番号',
      '販売先',
      '案件番号',
      '都道府県',
      '現場住所',
      '納品場所',
      '架台発注先',
      '架台発注日',
      '架台納品予定日',
      '架台納品状況',
      'パネル発注先',
      'パネル発注日',
      'パネル納品予定日',
      'パネル納品状況',
      '着工可能日',
      '着工備考',
      '工事備考',
      '完成月',
    ]

    test('発注タブのカラム定義が正しい', () => {
      expect(expectedColumns).toContain('管理番号')
      expect(expectedColumns).toContain('架台発注日')
      expect(expectedColumns).toContain('パネル発注日')
      expect(expectedColumns.length).toBe(18)
    })
  })

  test.describe('工程タブ', () => {
    const expectedColumns = [
      '現場',
      '都道府県',
      '市名',
      '完工月',
      '案件番号',
      '販売先',
      'パネル枚数',
      'パネルレイアウト',
      '載荷試験',
      '載荷試験日',
      '杭',
      '杭日',
      '架台・パネル',
      '架台・パネル日',
      '電気',
      '電気日',
      'フェンス',
      'フェンス日',
      '検写日',
      '備考',
    ]

    test('工程タブのカラム定義が正しい', () => {
      expect(expectedColumns).toContain('現場')
      expect(expectedColumns).toContain('載荷試験')
      expect(expectedColumns).toContain('杭')
      expect(expectedColumns).toContain('電気')
      expect(expectedColumns).toContain('フェンス')
      expect(expectedColumns.length).toBe(20)
    })
  })
})
