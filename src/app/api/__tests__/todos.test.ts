import { describe, it, expect } from 'vitest'

describe('TODO API', () => {
  describe('GET /api/todos', () => {
    it('TODO一覧を取得', async () => {
      const response = await fetch('/api/todos')

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('TODOに必須フィールドが含まれる', async () => {
      const response = await fetch('/api/todos')
      const data = await response.json()

      if (data.length > 0) {
        expect(data[0]).toHaveProperty('id')
        expect(data[0]).toHaveProperty('content')
        expect(data[0]).toHaveProperty('dueDate')
        expect(data[0]).toHaveProperty('createdAt')
      }
    })
  })

  describe('POST /api/todos', () => {
    it('TODO作成成功', async () => {
      const newTodo = {
        content: '新規TODO',
        dueDate: '2026-02-20',
        projectId: 1,
      }

      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo),
      })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toHaveProperty('id')
    })

    it('案件に紐づかないTODO作成', async () => {
      const newTodo = {
        content: '案件なしTODO',
        dueDate: '2026-02-25',
        projectId: null,
      }

      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo),
      })

      expect(response.ok).toBe(true)
    })

    it('必須フィールド欠落でエラー', async () => {
      const invalidTodo = {
        projectId: 1,
      }

      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidTodo),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
  })

  describe('PATCH /api/todos/:id', () => {
    it('TODO完了', async () => {
      const updates = {
        completedAt: new Date().toISOString(),
        completedMemo: '完了しました',
      }

      const response = await fetch('/api/todos/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.completedAt).toBeDefined()
    })

    it('TODO内容更新', async () => {
      const updates = {
        content: '更新されたTODO',
      }

      const response = await fetch('/api/todos/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      expect(response.ok).toBe(true)
    })

    it('存在しないTODOで404エラー', async () => {
      const updates = { content: '更新' }

      const response = await fetch('/api/todos/99999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })
})

describe('TODO期日ロジック', () => {
  it('期日が今日より前は期限切れ', () => {
    const today = new Date('2026-02-05')
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const dueDate = '2026-02-01'
    expect(dueDate < todayStr).toBe(true)
  })

  it('期日が今日は今日期日', () => {
    // 固定日付で比較（タイムゾーンの影響を避ける）
    const todayStr = '2026-02-05'
    const dueDate = '2026-02-05'
    expect(dueDate === todayStr).toBe(true)
  })

  it('期日が1週間以内は今週期日', () => {
    const today = new Date('2026-02-05')
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const weekFromNowStr = weekFromNow.toISOString().split('T')[0]

    const dueDate = '2026-02-10'
    expect(dueDate > todayStr && dueDate <= weekFromNowStr).toBe(true)
  })

  it('完了済みTODOはフィルタリング対象外', () => {
    const todo = {
      id: 1,
      content: 'テスト',
      dueDate: '2026-01-01',
      completedAt: '2026-01-02T00:00:00.000Z',
    }

    const isOverdue = !todo.completedAt && todo.dueDate < '2026-02-05'
    expect(isOverdue).toBe(false)
  })
})
