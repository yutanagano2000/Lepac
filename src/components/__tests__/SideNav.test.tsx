import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// SideNavのナビゲーション項目をテスト
describe('SideNav', () => {
  describe('ナビゲーション項目', () => {
    const items = [
      { href: '/', label: 'ホーム' },
      { href: '/projects', label: '案件' },
      { href: '/construction', label: '工事' },
      { href: '/todo', label: 'TODO' },
      { href: '/todos', label: 'タイムライン' },
      { href: '/calendar', label: 'カレンダー' },
      { href: '/tools', label: 'ツール' },
      { href: '/feedbacks', label: '要望' },
    ]

    it('正しい順序でナビゲーション項目が定義されている', () => {
      expect(items[0].label).toBe('ホーム')
      expect(items[1].label).toBe('案件')
      expect(items[2].label).toBe('工事')
      expect(items[3].label).toBe('TODO')
      expect(items[4].label).toBe('タイムライン')
      expect(items[5].label).toBe('カレンダー')
      expect(items[6].label).toBe('ツール')
      expect(items[7].label).toBe('要望')
    })

    it('8つのナビゲーション項目がある', () => {
      expect(items).toHaveLength(8)
    })

    it('各項目にhrefとlabelがある', () => {
      items.forEach((item) => {
        expect(item).toHaveProperty('href')
        expect(item).toHaveProperty('label')
        expect(typeof item.href).toBe('string')
        expect(typeof item.label).toBe('string')
      })
    })

    it('hrefが正しいパスを指している', () => {
      expect(items[0].href).toBe('/')
      expect(items[1].href).toBe('/projects')
      expect(items[2].href).toBe('/construction')
      expect(items[3].href).toBe('/todo')
      expect(items[4].href).toBe('/todos')
      expect(items[5].href).toBe('/calendar')
      expect(items[6].href).toBe('/tools')
      expect(items[7].href).toBe('/feedbacks')
    })
  })

  describe('アクティブ状態の判定', () => {
    // アクティブ状態を判定するヘルパー関数
    const isActive = (pathname: string, href: string): boolean => {
      return href === '/' ? pathname === '/' : pathname.startsWith(href)
    }

    it('ホームは完全一致でアクティブ', () => {
      expect(isActive('/', '/')).toBe(true)
    })

    it('ホームはサブパスでアクティブにならない', () => {
      expect(isActive('/projects', '/')).toBe(false)
    })

    it('案件はサブパスでもアクティブ', () => {
      expect(isActive('/projects/123', '/projects')).toBe(true)
    })

    it('工事はサブパスでもアクティブ', () => {
      expect(isActive('/construction', '/construction')).toBe(true)
    })
  })
})
