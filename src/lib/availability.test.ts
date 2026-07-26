import { describe, expect, it } from 'vitest'
import { aggregateAvailability } from '@/lib/availability'

const DATES = ['2026-08-01', '2026-08-02', '2026-08-03']

function submission(id: string, dates: string[]) {
  return { id, submitterName: id, dates }
}

describe('aggregateAvailability', () => {
  it('returns zeroed rows and no best day with no submissions', () => {
    const result = aggregateAvailability(DATES, [])
    expect(result.totalSubmissions).toBe(0)
    expect(result.perDate).toEqual(
      DATES.map((date) => ({ date, count: 0, submissionIds: [] })),
    )
    expect(result.bestDates).toEqual([])
    expect(result.bestCount).toBe(0)
  })

  it('counts availability per date and picks the winner', () => {
    const result = aggregateAvailability(DATES, [
      submission('a', ['2026-08-01', '2026-08-02']),
      submission('b', ['2026-08-02']),
      submission('c', ['2026-08-02', '2026-08-03']),
    ])
    expect(result.totalSubmissions).toBe(3)
    expect(result.perDate[1]).toEqual({
      date: '2026-08-02',
      count: 3,
      submissionIds: ['a', 'b', 'c'],
    })
    expect(result.bestDates).toEqual(['2026-08-02'])
    expect(result.bestCount).toBe(3)
  })

  it('reports every date tied at the max', () => {
    const result = aggregateAvailability(DATES, [
      submission('a', ['2026-08-01', '2026-08-03']),
      submission('b', ['2026-08-01', '2026-08-03']),
    ])
    expect(result.bestDates).toEqual(['2026-08-01', '2026-08-03'])
    expect(result.bestCount).toBe(2)
  })

  it('has no best day when every submission is empty', () => {
    const result = aggregateAvailability(DATES, [
      submission('a', []),
      submission('b', []),
    ])
    expect(result.totalSubmissions).toBe(2)
    expect(result.bestDates).toEqual([])
    expect(result.bestCount).toBe(0)
  })

  it('ignores submission dates the event no longer offers', () => {
    const result = aggregateAvailability(DATES, [
      submission('a', ['2026-07-01', '2026-08-01']),
    ])
    expect(result.perDate.map((entry) => entry.count)).toEqual([1, 0, 0])
    expect(result.bestDates).toEqual(['2026-08-01'])
  })
})
