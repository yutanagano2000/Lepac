import { describe, it, expect } from 'vitest'

describe('工事API', () => {
  describe('GET /api/construction', () => {
    it('工事案件一覧を取得', async () => {
      const response = await fetch('/api/construction')

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data).toHaveProperty('projects')
      expect(data).toHaveProperty('count')
      expect(Array.isArray(data.projects)).toBe(true)
    })

    it('工事案件に発注タブ用フィールドが含まれる', async () => {
      const response = await fetch('/api/construction')
      const data = await response.json()

      if (data.projects.length > 0) {
        const project = data.projects[0]
        expect(project).toHaveProperty('mountOrderDate')
        expect(project).toHaveProperty('mountDeliveryScheduled')
        expect(project).toHaveProperty('panelOrderDate')
        expect(project).toHaveProperty('panelDeliveryScheduled')
        expect(project).toHaveProperty('constructionAvailableDate')
      }
    })

    it('工事案件に工程タブ用フィールドが含まれる', async () => {
      const response = await fetch('/api/construction')
      const data = await response.json()

      if (data.projects.length > 0) {
        const project = data.projects[0]
        expect(project).toHaveProperty('loadTestStatus')
        expect(project).toHaveProperty('loadTestDate')
        expect(project).toHaveProperty('pileStatus')
        expect(project).toHaveProperty('pileDate')
      }
    })
  })

  describe('PATCH /api/construction/:id', () => {
    it('日付フィールドを更新', async () => {
      const updates = { mountOrderDate: '2026-02-15' }

      const response = await fetch('/api/construction/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('ステータスフィールドを更新', async () => {
      const updates = { loadTestStatus: '完了' }

      const response = await fetch('/api/construction/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('複数フィールドを同時に更新', async () => {
      const updates = {
        loadTestStatus: '完了',
        loadTestDate: '2026-02-10',
        pileStatus: '進行中',
      }

      const response = await fetch('/api/construction/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })
})

describe('完工月フィルタリング', () => {
  it('完工月のパース - yyyy-MM形式', () => {
    const completionMonth = '2026-02'
    const match = completionMonth.match(/(\d{4})[-/年]?(\d{1,2})/)

    expect(match).not.toBeNull()
    if (match) {
      expect(parseInt(match[1])).toBe(2026)
      expect(parseInt(match[2])).toBe(2)
    }
  })

  it('完工月のパース - yyyy/MM形式', () => {
    const completionMonth = '2026/02'
    const match = completionMonth.match(/(\d{4})[-/年]?(\d{1,2})/)

    expect(match).not.toBeNull()
    if (match) {
      expect(parseInt(match[1])).toBe(2026)
      expect(parseInt(match[2])).toBe(2)
    }
  })

  it('完工月のパース - yyyy年MM月形式', () => {
    const completionMonth = '2026年2月'
    const match = completionMonth.match(/(\d{4})[-/年]?(\d{1,2})/)

    expect(match).not.toBeNull()
    if (match) {
      expect(parseInt(match[1])).toBe(2026)
      expect(parseInt(match[2])).toBe(2)
    }
  })

  it('無効な完工月はnull', () => {
    const completionMonth = 'invalid'
    const match = completionMonth.match(/(\d{4})[-/年]?(\d{1,2})/)

    expect(match).toBeNull()
  })
})
