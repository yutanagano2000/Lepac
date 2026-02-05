import { describe, it, expect } from 'vitest'
import { parsePrefectureAndCity } from '../address'

describe('住所パースユーティリティ', () => {
  describe('parsePrefectureAndCity', () => {
    it('広島県の住所をパース', () => {
      const result = parsePrefectureAndCity('広島県福山市瀬戸町123-4')
      expect(result).toEqual({
        prefectureName: '広島県',
        cityName: '福山市',
      })
    })

    it('岡山県の住所をパース', () => {
      const result = parsePrefectureAndCity('岡山県井原市西江原町6389-1')
      expect(result).toEqual({
        prefectureName: '岡山県',
        cityName: '井原市',
      })
    })

    it('町をパース', () => {
      const result = parsePrefectureAndCity('岡山県小田郡矢掛町矢掛123')
      expect(result).toEqual({
        prefectureName: '岡山県',
        cityName: '小田郡矢掛町', // 郡+町まで含む
      })
    })

    it('区をパース', () => {
      const result = parsePrefectureAndCity('広島県広島市安佐北区安佐町')
      expect(result).toEqual({
        prefectureName: '広島県',
        cityName: '広島市',
      })
    })

    it('町をパース（郡付き）', () => {
      const result = parsePrefectureAndCity('広島県山県郡北広島町123')
      expect(result).toEqual({
        prefectureName: '広島県',
        cityName: '山県郡北広島町', // 郡+町まで含む
      })
    })

    it('都道府県なしの住所', () => {
      const result = parsePrefectureAndCity('福山市瀬戸町123-4')
      expect(result).toEqual({
        prefectureName: '',
        cityName: '福山市',
      })
    })

    it('空文字は空を返す', () => {
      const result = parsePrefectureAndCity('')
      expect(result).toEqual({
        prefectureName: '',
        cityName: '',
      })
    })

    it('nullは空を返す', () => {
      const result = parsePrefectureAndCity(null)
      expect(result).toEqual({
        prefectureName: '',
        cityName: '',
      })
    })

    it('空白のみは空を返す', () => {
      const result = parsePrefectureAndCity('   ')
      expect(result).toEqual({
        prefectureName: '',
        cityName: '',
      })
    })
  })
})
