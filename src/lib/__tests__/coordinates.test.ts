import { describe, it, expect } from 'vitest'
import {
  splitCoordinateString,
  parseCoordinateString,
  normalizeCoordinateString,
} from '../coordinates'

describe('座標変換ユーティリティ', () => {
  describe('splitCoordinateString', () => {
    it('カンマ区切りの座標を分割', () => {
      const result = splitCoordinateString('34.386542, 131.56731')
      expect(result).toEqual(['34.386542', '131.56731'])
    })

    it('スラッシュ区切りの座標を分割', () => {
      const result = splitCoordinateString('34.386542/131.56731')
      expect(result).toEqual(['34.386542', '131.56731'])
    })

    it('スペース区切りの座標を分割', () => {
      const result = splitCoordinateString('34.386542 131.56731')
      expect(result).toEqual(['34.386542', '131.56731'])
    })

    it('前後の空白をトリム', () => {
      const result = splitCoordinateString('  34.386542 , 131.56731  ')
      expect(result).toEqual(['34.386542', '131.56731'])
    })

    it('空文字は空配列を返す', () => {
      const result = splitCoordinateString('')
      expect(result).toEqual([])
    })

    it('nullは空配列を返す', () => {
      const result = splitCoordinateString(null as unknown as string)
      expect(result).toEqual([])
    })
  })

  describe('parseCoordinateString', () => {
    it('有効な座標をパース', () => {
      const result = parseCoordinateString('34.386542, 131.56731')
      expect(result).toEqual({ lat: '34.386542', lon: '131.56731' })
    })

    it('スラッシュ区切りをパース', () => {
      const result = parseCoordinateString('34.386542/131.56731')
      expect(result).toEqual({ lat: '34.386542', lon: '131.56731' })
    })

    it('座標が1つだけの場合はnull', () => {
      const result = parseCoordinateString('34.386542')
      expect(result).toBeNull()
    })

    it('無効な座標はnull', () => {
      const result = parseCoordinateString('invalid')
      expect(result).toBeNull()
    })

    it('空文字はnull', () => {
      const result = parseCoordinateString('')
      expect(result).toBeNull()
    })

    it('数値でない値はnull', () => {
      const result = parseCoordinateString('abc, def')
      expect(result).toBeNull()
    })
  })

  describe('normalizeCoordinateString', () => {
    it('座標を正規化', () => {
      const result = normalizeCoordinateString('34.386542 / 131.56731')
      expect(result).toBe('34.386542,131.56731')
    })

    it('カンマ区切りを正規化', () => {
      const result = normalizeCoordinateString('34.386542, 131.56731')
      expect(result).toBe('34.386542,131.56731')
    })

    it('無効な座標は空文字', () => {
      const result = normalizeCoordinateString('invalid')
      expect(result).toBe('')
    })

    it('空文字は空文字を返す', () => {
      const result = normalizeCoordinateString('')
      expect(result).toBe('')
    })
  })
})
