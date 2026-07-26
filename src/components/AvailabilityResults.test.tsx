import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AvailabilityResults } from '@/components/AvailabilityResults'
import { aggregateAvailability } from '@/lib/availability'

const DATES = ['2026-08-01', '2026-08-02']

const SUBMISSIONS = [
  {
    id: 's1',
    submitterName: 'Ada Lovelace',
    dates: ['2026-08-01', '2026-08-02'],
  },
  { id: 's2', submitterName: 'Grace Hopper', dates: ['2026-08-02'] },
]

function renderResults(
  submissions = SUBMISSIONS,
  focusedSubmissionId?: string,
) {
  return render(
    <AvailabilityResults
      result={aggregateAvailability(DATES, submissions)}
      submissions={submissions}
      focusedSubmissionId={focusedSubmissionId}
    />,
  )
}

describe('AvailabilityResults', () => {
  it('recommends the single best day with counts', () => {
    renderResults()
    expect(
      screen.getByText('Sun, Aug 2 works best — 2 of 2 people can make it.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Best day')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })

  it('prompts for responses when there are none', () => {
    renderResults([])
    expect(
      screen.getByText(/No responses yet — share the link/),
    ).toBeInTheDocument()
    expect(screen.queryByText('Best day')).not.toBeInTheDocument()
  })

  it('reports ties', () => {
    renderResults([
      { id: 's1', submitterName: 'Ada', dates: DATES },
      { id: 's2', submitterName: 'Grace', dates: DATES },
    ])
    expect(
      screen.getByText('2 days tie for best — 2 of 2 people can make each.'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Best day')).toHaveLength(2)
  })

  it('shows member initials when names are visible', () => {
    renderResults()
    expect(screen.getAllByTitle('Ada Lovelace').length).toBeGreaterThan(0)
    expect(screen.getAllByText('AL').length).toBeGreaterThan(0)
  })

  it('hides the chip rows entirely when all names are hidden', () => {
    renderResults([
      { id: 's1', submitterName: '', dates: ['2026-08-01'] },
      { id: 's2', submitterName: '', dates: ['2026-08-02'] },
    ])
    expect(screen.queryByTitle('Hidden')).not.toBeInTheDocument()
  })
})
