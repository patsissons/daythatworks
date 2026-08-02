import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    expect(
      screen.getAllByRole('button', { name: 'Ada Lovelace' }).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('AL').length).toBeGreaterThan(0)
  })

  function popoverText(name: string) {
    return screen.queryByText(name, {
      selector: '[data-slot="popover-content"]',
    })
  }

  it('reveals the full name in a popover on hover and hides it on leave', async () => {
    renderResults()
    const chip = screen.getAllByRole('button', { name: 'Grace Hopper' })[0]
    fireEvent.pointerEnter(chip)
    await waitFor(() => expect(popoverText('Grace Hopper')).toBeInTheDocument())
    fireEvent.pointerLeave(chip)
    await waitFor(() =>
      expect(popoverText('Grace Hopper')).not.toBeInTheDocument(),
    )
  })

  it('only ever shows one popover across the group', async () => {
    renderResults()
    fireEvent.pointerEnter(
      screen.getAllByRole('button', { name: 'Grace Hopper' })[0],
    )
    await waitFor(() => expect(popoverText('Grace Hopper')).toBeInTheDocument())
    fireEvent.pointerEnter(
      screen.getAllByRole('button', { name: 'Ada Lovelace' })[0],
    )
    await waitFor(() => expect(popoverText('Ada Lovelace')).toBeInTheDocument())
    expect(popoverText('Grace Hopper')).not.toBeInTheDocument()
  })

  it('a tap (click) toggles the popover for touch devices', async () => {
    renderResults()
    const chip = screen.getAllByRole('button', { name: 'Grace Hopper' })[0]
    fireEvent.click(chip)
    await waitFor(() => expect(popoverText('Grace Hopper')).toBeInTheDocument())
    fireEvent.click(chip)
    await waitFor(() =>
      expect(popoverText('Grace Hopper')).not.toBeInTheDocument(),
    )
  })

  it('offers add-to-calendar on every date row when the event is provided', () => {
    render(
      <AvailabilityResults
        result={aggregateAvailability(DATES, SUBMISSIONS)}
        submissions={SUBMISSIONS}
        event={{
          id: 'evt1',
          title: 'Summer BBQ',
          description: '',
          slug: 'summer-bbq',
        }}
      />,
    )
    expect(
      screen.getAllByRole('button', { name: /Add .* to calendar/ }),
    ).toHaveLength(DATES.length)
  })

  it('omits add-to-calendar without an event', () => {
    renderResults()
    expect(
      screen.queryByRole('button', { name: /Add .* to calendar/ }),
    ).not.toBeInTheDocument()
  })

  it('hides the chip rows entirely when all names are hidden', () => {
    renderResults([
      { id: 's1', submitterName: '', dates: ['2026-08-01'] },
      { id: 's2', submitterName: '', dates: ['2026-08-02'] },
    ])
    expect(
      screen.queryByRole('button', { name: 'Name hidden' }),
    ).not.toBeInTheDocument()
  })
})
