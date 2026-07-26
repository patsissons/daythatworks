import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MultiDatePicker } from '@/components/MultiDatePicker'

describe('MultiDatePicker', () => {
  it('shows the month of the first selected date', () => {
    render(<MultiDatePicker selected={['2026-08-15']} onChange={() => {}} />)
    expect(screen.getByText('August 2026')).toBeInTheDocument()
  })

  it('toggles a date on and keeps the selection sorted', () => {
    const onChange = vi.fn()
    render(<MultiDatePicker selected={['2026-08-15']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '2026-08-03' }))
    expect(onChange).toHaveBeenCalledWith(['2026-08-03', '2026-08-15'])
  })

  it('toggles a selected date off', () => {
    const onChange = vi.fn()
    render(<MultiDatePicker selected={['2026-08-15']} onChange={onChange} />)
    const day = screen.getByRole('button', { name: '2026-08-15' })
    expect(day).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(day)
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('disables days before minDate', () => {
    render(
      <MultiDatePicker
        selected={['2026-08-15']}
        onChange={() => {}}
        minDate="2026-08-10"
      />,
    )
    expect(screen.getByRole('button', { name: '2026-08-09' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '2026-08-10' })).toBeEnabled()
  })

  it('navigates months', () => {
    render(<MultiDatePicker selected={['2026-08-15']} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByText('September 2026')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByText('July 2026')).toBeInTheDocument()
  })
})
