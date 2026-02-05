import { describe, it, expect } from 'vitest'

describe('ダッシュボードAPI', () => {
  describe('GET /api/dashboard', () => {
    it('ダッシュボードデータを取得', async () => {
      const response = await fetch('/api/dashboard')

      expect(response.ok).toBe(true)
      const data = await response.json()

      expect(data).toHaveProperty('overdueTodos')
      expect(data).toHaveProperty('todayTodos')
      expect(data).toHaveProperty('thisWeekTodos')
      expect(data).toHaveProperty('projectAlerts')
      expect(data).toHaveProperty('activeProjects')
      expect(data).toHaveProperty('completionAlerts')
      expect(data).toHaveProperty('siteInvestigationAlerts')
    })

    it('期日超過TODOにカウントとアイテムが含まれる', async () => {
      const response = await fetch('/api/dashboard')
      const data = await response.json()

      expect(data.overdueTodos).toHaveProperty('count')
      expect(data.overdueTodos).toHaveProperty('items')
      expect(typeof data.overdueTodos.count).toBe('number')
      expect(Array.isArray(data.overdueTodos.items)).toBe(true)
    })

    it('完工アラートに赤・黄カウントが含まれる', async () => {
      const response = await fetch('/api/dashboard')
      const data = await response.json()

      expect(data.completionAlerts).toHaveProperty('redCount')
      expect(data.completionAlerts).toHaveProperty('yellowCount')
      expect(data.completionAlerts).toHaveProperty('items')
    })

    it('現調未実施アラートに赤・黄カウントが含まれる', async () => {
      const response = await fetch('/api/dashboard')
      const data = await response.json()

      expect(data.siteInvestigationAlerts).toHaveProperty('redCount')
      expect(data.siteInvestigationAlerts).toHaveProperty('yellowCount')
      expect(data.siteInvestigationAlerts).toHaveProperty('items')
    })
  })
})

describe('ダッシュボードロジック', () => {
  describe('期日判定', () => {
    it('今日より前の日付は期限切れ', () => {
      const today = '2026-02-05'
      const dueDate = '2026-02-04'

      expect(dueDate < today).toBe(true)
    })

    it('今日の日付は今日期日', () => {
      const today = '2026-02-05'
      const dueDate = '2026-02-05'

      expect(dueDate === today).toBe(true)
    })

    it('今日より後の日付は今週期日候補', () => {
      const today = '2026-02-05'
      const dueDate = '2026-02-10'

      expect(dueDate > today).toBe(true)
    })
  })

  describe('完工アラート判定', () => {
    it('2ヶ月以内は赤アラート', () => {
      const now = new Date('2026-02-05')
      const completionDate = new Date('2026-04-01')

      const monthsDiff =
        (completionDate.getFullYear() - now.getFullYear()) * 12 +
        (completionDate.getMonth() - now.getMonth())

      expect(monthsDiff).toBeLessThanOrEqual(2)
      const level = monthsDiff <= 2 ? 'red' : 'yellow'
      expect(level).toBe('red')
    })

    it('3ヶ月以内は黄アラート', () => {
      const now = new Date('2026-02-05')
      const completionDate = new Date('2026-05-01')

      const monthsDiff =
        (completionDate.getFullYear() - now.getFullYear()) * 12 +
        (completionDate.getMonth() - now.getMonth())

      expect(monthsDiff).toBe(3)
      const level = monthsDiff <= 2 ? 'red' : monthsDiff <= 3 ? 'yellow' : null
      expect(level).toBe('yellow')
    })

    it('4ヶ月以上はアラートなし', () => {
      const now = new Date('2026-02-05')
      const completionDate = new Date('2026-06-01')

      const monthsDiff =
        (completionDate.getFullYear() - now.getFullYear()) * 12 +
        (completionDate.getMonth() - now.getMonth())

      expect(monthsDiff).toBe(4)
      const level = monthsDiff <= 2 ? 'red' : monthsDiff <= 3 ? 'yellow' : null
      expect(level).toBeNull()
    })
  })

  describe('完工月パース', () => {
    function parseCompletionMonth(completionMonth: string | null): Date | null {
      if (!completionMonth) return null
      const match = completionMonth.match(/(\d{4})[-/年]?(\d{1,2})/)
      if (match) {
        const year = parseInt(match[1])
        const month = parseInt(match[2]) - 1
        return new Date(year, month, 1)
      }
      return null
    }

    it('yyyy-MM形式をパース', () => {
      const result = parseCompletionMonth('2026-02')
      expect(result).not.toBeNull()
      expect(result?.getFullYear()).toBe(2026)
      expect(result?.getMonth()).toBe(1) // 0-indexed
    })

    it('yyyy/MM形式をパース', () => {
      const result = parseCompletionMonth('2026/03')
      expect(result).not.toBeNull()
      expect(result?.getFullYear()).toBe(2026)
      expect(result?.getMonth()).toBe(2)
    })

    it('nullはnullを返す', () => {
      const result = parseCompletionMonth(null)
      expect(result).toBeNull()
    })

    it('無効な形式はnullを返す', () => {
      const result = parseCompletionMonth('invalid')
      expect(result).toBeNull()
    })
  })
})
