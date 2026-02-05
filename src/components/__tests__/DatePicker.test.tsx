import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DatePicker } from '../ui/date-picker'

describe('DatePicker', () => {
  it('プレースホルダーを表示', () => {
    render(<DatePicker placeholder="日付を選択" />)
    expect(screen.getByRole('button')).toHaveTextContent('日付を選択')
  })

  it('yyyy-MM-dd形式の日付を表示', () => {
    render(<DatePicker value="2026-02-15" />)
    expect(screen.getByRole('button')).toHaveTextContent('2026/02/15')
  })

  it('yyyy/MM/dd形式の日付を表示', () => {
    render(<DatePicker value="2026/02/15" />)
    expect(screen.getByRole('button')).toHaveTextContent('2026/02/15')
  })

  it('無効な日付はプレースホルダーを表示', () => {
    render(<DatePicker value="invalid" placeholder="-" />)
    expect(screen.getByRole('button')).toHaveTextContent('-')
  })

  it('nullはプレースホルダーを表示', () => {
    render(<DatePicker value={null} placeholder="-" />)
    expect(screen.getByRole('button')).toHaveTextContent('-')
  })

  it('ボタンをクリック可能', async () => {
    const onChange = vi.fn()
    render(<DatePicker onChange={onChange} />)
    const button = screen.getByRole('button')

    // ボタンが存在し、クリック可能であることを確認
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })

  it('disabledの場合はクリック無効', () => {
    render(<DatePicker disabled />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('カスタムclassNameを適用', () => {
    render(<DatePicker className="custom-class" />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })
})
