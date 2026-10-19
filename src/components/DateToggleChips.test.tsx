import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DateToggleChips } from '@/components/DateToggleChips'

describe('DateToggleChips', () => {
  it('labels dates by default', () => {
    render(
      <DateToggleChips
        dates={['2026-07-25']}
        selected={[]}
        onChange={() => {}}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Sat, Jul 25' }),
    ).toBeInTheDocument()
  })

  it('keeps selections in the options order, not alphabetical', () => {
    const onChange = vi.fn()
    render(
      <DateToggleChips
        dates={['sun', 'mon', 'sat']}
        selected={['sat']}
        onChange={onChange}
        formatLabel={(value) => value.toUpperCase()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'MON' }))
    expect(onChange).toHaveBeenLastCalledWith(['mon', 'sat'])
    fireEvent.click(screen.getByRole('button', { name: 'SUN' }))
    expect(onChange).toHaveBeenLastCalledWith(['sun', 'sat'])
  })

  it('deselects a selected option', () => {
    const onChange = vi.fn()
    render(
      <DateToggleChips
        dates={['sun', 'mon']}
        selected={['sun', 'mon']}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getAllByRole('button', { pressed: true })[0])
    expect(onChange).toHaveBeenLastCalledWith(['mon'])
  })
})
