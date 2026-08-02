import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AvailabilityHeatmap } from '@/components/AvailabilityHeatmap'
import { aggregateAvailability } from '@/lib/availability'

const DATES = ['2026-08-01', '2026-08-02', '2026-09-05']

const SUBMISSIONS = [
  {
    id: 's1',
    submitterName: 'Ada Lovelace',
    dates: ['2026-08-01', '2026-08-02'],
  },
  { id: 's2', submitterName: 'Grace Hopper', dates: ['2026-08-02'] },
]

function renderHeatmap(
  submissions = SUBMISSIONS,
  focusedSubmissionId?: string,
) {
  return render(
    <AvailabilityHeatmap
      result={aggregateAvailability(DATES, submissions)}
      submissions={submissions}
      focusedSubmissionId={focusedSubmissionId}
    />,
  )
}

function cell(label: RegExp) {
  return screen.getByRole('button', { name: label })
}

describe('AvailabilityHeatmap', () => {
  it('renders one month grid per month with candidate days as cells', () => {
    renderHeatmap()
    expect(screen.getByText('August 2026')).toBeInTheDocument()
    expect(screen.getByText('September 2026')).toBeInTheDocument()
    expect(cell(/Sat, Aug 1 — 1 of 2 available/)).toBeInTheDocument()
    expect(
      cell(/Sun, Aug 2 — 2 of 2 available \(best day\)/),
    ).toBeInTheDocument()
    expect(cell(/Sat, Sep 5 — 0 of 2 available/)).toBeInTheDocument()
  })

  it('shades cells by availability fraction', () => {
    renderHeatmap()
    expect(cell(/Aug 1/).className).toContain('bg-primary/40')
    expect(cell(/Aug 2/).className).toMatch(/bg-primary(?!\/)/)
    expect(cell(/Sep 5/).className).not.toContain('bg-primary')
  })

  it('marks the best day with the amber ring and legend entry', () => {
    renderHeatmap()
    expect(cell(/Aug 2/).className).toContain('ring-amber-400')
    expect(screen.getByText('Best day')).toBeInTheDocument()
  })

  it('shows a tooltip with names when hovering a day', () => {
    renderHeatmap()
    fireEvent.mouseEnter(cell(/Aug 2/))
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Sun, Aug 2 · 2/2')
    expect(tooltip).toHaveTextContent('Ada Lovelace, Grace Hopper')
    fireEvent.mouseLeave(cell(/Aug 2/))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('dims responders who cannot make the hovered day', () => {
    renderHeatmap()
    fireEvent.mouseEnter(cell(/Aug 1/))
    expect(
      screen.getByRole('button', { name: 'Grace Hopper' }).className,
    ).toContain('opacity-40')
    expect(
      screen.getByRole('button', { name: 'Ada Lovelace' }).className,
    ).not.toContain('opacity-40')
  })

  it('outlines the days a hovered responder can make', () => {
    renderHeatmap()
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Grace Hopper' }))
    expect(cell(/Aug 2/).className).toContain('outline-dashed')
    expect(cell(/Aug 1/).className).not.toContain('outline-dashed')
  })

  it('persistently outlines the focused submission when idle', () => {
    renderHeatmap(SUBMISSIONS, 's1')
    expect(cell(/Aug 1/).className).toContain('outline-dashed')
  })

  it('handles hidden names with a count instead of a list', () => {
    renderHeatmap([
      { id: 's1', submitterName: '', dates: ['2026-08-01'] },
      { id: 's2', submitterName: '', dates: ['2026-08-02'] },
    ])
    expect(screen.getByText('2 responses (names hidden)')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Anonymous' }),
    ).not.toBeInTheDocument()
  })

  it('prompts when there are no responses', () => {
    renderHeatmap([])
    expect(screen.getByText('No responses yet.')).toBeInTheDocument()
  })
})
