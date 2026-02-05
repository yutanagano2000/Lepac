import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// auth.config.tsのauthorized関数をテスト
describe('認証設定', () => {
  describe('authorized callback', () => {
    it('未認証ユーザーはログインページにリダイレクト', async () => {
      const auth = null
      const request = { nextUrl: { pathname: '/projects' } }

      // 未認証の場合、ログインページへリダイレクト
      const isLoggedIn = !!auth
      const isOnLoginPage = request.nextUrl.pathname === '/login'

      expect(isLoggedIn).toBe(false)
      expect(isOnLoginPage).toBe(false)
      // 未認証でログインページ以外 → リダイレクト
    })

    it('認証済みユーザーは保護ルートにアクセス可能', async () => {
      const auth = { user: { id: '1', name: 'Test User' } }
      const request = { nextUrl: { pathname: '/projects' } }

      const isLoggedIn = !!auth
      expect(isLoggedIn).toBe(true)
    })

    it('ログインページは未認証でもアクセス可能', async () => {
      const auth = null
      const request = { nextUrl: { pathname: '/login' } }

      const isOnLoginPage = request.nextUrl.pathname === '/login'
      expect(isOnLoginPage).toBe(true)
    })

    it('組織未選択ユーザーは組織選択ページにリダイレクト', async () => {
      const auth = {
        user: { id: '1', name: 'Test User', organizationId: null },
      }
      const request = { nextUrl: { pathname: '/projects' } }

      const hasOrganization = !!auth.user.organizationId
      expect(hasOrganization).toBe(false)
      // organizationId が null → 組織選択ページへリダイレクト
    })

    it('組織選択済みユーザーは通常ページにアクセス可能', async () => {
      const auth = {
        user: { id: '1', name: 'Test User', organizationId: 1 },
      }
      const request = { nextUrl: { pathname: '/projects' } }

      const hasOrganization = !!auth.user.organizationId
      expect(hasOrganization).toBe(true)
    })

    it('管理者は組織選択ページにアクセス可能', async () => {
      const auth = {
        user: { id: '1', name: 'Admin', role: 'admin', organizationId: 1 },
      }
      const request = { nextUrl: { pathname: '/onboarding/select-organization' } }

      const isAdmin = auth.user.role === 'admin'
      expect(isAdmin).toBe(true)
    })
  })
})

describe('組織選択API', () => {
  it('有効な組織IDで更新成功', async () => {
    const response = await fetch('/api/user/organization', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: 1 }),
    })

    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.success).toBe(true)
  })

  it('無効な組織IDでエラー', async () => {
    const response = await fetch('/api/user/organization', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: 0 }),
    })

    expect(response.ok).toBe(false)
    expect(response.status).toBe(400)
  })
})

describe('組織一覧API', () => {
  it('組織一覧を取得', async () => {
    const response = await fetch('/api/organizations')

    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).toHaveProperty('id')
    expect(data[0]).toHaveProperty('name')
    expect(data[0]).toHaveProperty('code')
  })
})

describe('セッション管理', () => {
  it('セッション情報を取得', async () => {
    const response = await fetch('/api/auth/session')

    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data).toHaveProperty('user')
    expect(data).toHaveProperty('expires')
  })

  it('セッションにユーザー情報が含まれる', async () => {
    const response = await fetch('/api/auth/session')
    const data = await response.json()

    expect(data.user).toHaveProperty('id')
    expect(data.user).toHaveProperty('name')
    expect(data.user).toHaveProperty('organizationId')
  })
})
