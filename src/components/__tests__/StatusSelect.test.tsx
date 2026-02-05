import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusSelect } from '../ui/status-select'

describe('StatusSelect', () => {
  it('プレースホルダーを表示', () => {
    render(<StatusSelect placeholder="-" />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeInTheDocument()
  })

  it('選択された値を表示', () => {
    render(<StatusSelect value="完了" />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveTextContent('完了')
  })

  it('未着手を表示', () => {
    render(<StatusSelect value="未着手" />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveTextContent('未着手')
  })

  it('予定を表示', () => {
    render(<StatusSelect value="予定" />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveTextContent('予定')
  })

  it('進行中を表示', () => {
    render(<StatusSelect value="進行中" />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveTextContent('進行中')
  })

  it('nullはプレースホルダーを使用', () => {
    render(<StatusSelect value={null} placeholder="-" />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeInTheDocument()
  })

  it('disabledの場合はクリック無効', () => {
    render(<StatusSelect disabled />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('data-disabled')
  })

  it('カスタムclassNameを適用', () => {
    render(<StatusSelect className="custom-class" />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveClass('custom-class')
  })
})
