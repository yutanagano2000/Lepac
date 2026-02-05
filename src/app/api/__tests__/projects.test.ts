import { describe, it, expect } from 'vitest'

describe('案件API', () => {
  describe('GET /api/projects', () => {
    it('案件一覧を取得', async () => {
      const response = await fetch('/api/projects')

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('案件に必須フィールドが含まれる', async () => {
      const response = await fetch('/api/projects')
      const data = await response.json()

      if (data.length > 0) {
        expect(data[0]).toHaveProperty('id')
        expect(data[0]).toHaveProperty('managementNumber')
        expect(data[0]).toHaveProperty('client')
        expect(data[0]).toHaveProperty('projectNumber')
      }
    })
  })

  describe('GET /api/projects/:id', () => {
    it('存在する案件を取得', async () => {
      const response = await fetch('/api/projects/1')

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.id).toBe(1)
    })

    it('存在しない案件で404エラー', async () => {
      const response = await fetch('/api/projects/99999')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/projects', () => {
    it('必須フィールドで案件作成成功', async () => {
      const newProject = {
        managementNumber: '9999',
        manager: 'テスト担当',
        client: 'テストクライアント',
        projectNumber: 'P9999',
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toHaveProperty('id')
    })

    it('必須フィールド欠落でエラー', async () => {
      const invalidProject = {
        manager: 'テスト担当',
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidProject),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
  })

  describe('PATCH /api/projects/:id', () => {
    it('案件を更新', async () => {
      const updates = { client: '更新クライアント' }

      const response = await fetch('/api/projects/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.client).toBe('更新クライアント')
    })

    it('存在しない案件の更新で404エラー', async () => {
      const updates = { client: '更新クライアント' }

      const response = await fetch('/api/projects/99999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/projects/:id', () => {
    it('案件を削除', async () => {
      const response = await fetch('/api/projects/1', {
        method: 'DELETE',
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('存在しない案件の削除で404エラー', async () => {
      const response = await fetch('/api/projects/99999', {
        method: 'DELETE',
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })
})
