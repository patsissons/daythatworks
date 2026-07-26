import { describe, expect, it } from 'vitest'
import {
  formatDisplayDate,
  isoDate,
  isValidISODate,
  monthGrid,
  monthLabel,
  parseISODate,
} from '@/lib/dates'

describe('isoDate / parseISODate', () => {
  it('round-trips any ISO date regardless of timezone', () => {
    for (const iso of [
      '2026-01-01',
      '2026-07-25',
      '2026-12-31',
      '2024-02-29',
    ]) {
      expect(isoDate(parseISODate(iso))).toBe(iso)
    }
  })

  it('parses to local noon so DST shifts cannot move the day', () => {
    const parsed = parseISODate('2026-03-08')
    expect(parsed.getHours()).toBe(12)
    expect(parsed.getDate()).toBe(8)
  })
})

describe('isValidISODate', () => {
  it('accepts real dates', () => {
    expect(isValidISODate('2026-07-25')).toBe(true)
    expect(isValidISODate('2024-02-29')).toBe(true)
  })

  it('rejects malformed and impossible dates', () => {
    expect(isValidISODate('2026-7-25')).toBe(false)
    expect(isValidISODate('2026-02-30')).toBe(false)
    expect(isValidISODate('2026-13-01')).toBe(false)
    expect(isValidISODate('2025-02-29')).toBe(false)
    expect(isValidISODate('not-a-date')).toBe(false)
  })
})

describe('formatDisplayDate', () => {
  it('formats weekday, month, and day', () => {
    expect(formatDisplayDate('2026-07-25')).toBe('Sat, Jul 25')
  })
})

describe('monthLabel', () => {
  it('labels a 0-based month', () => {
    expect(monthLabel(2026, 6)).toBe('July 2026')
  })
})

describe('monthGrid', () => {
  it('pads to full weeks with nulls', () => {
    const grid = monthGrid(2026, 6) // July 2026 starts on a Wednesday
    expect(grid.length % 7).toBe(0)
    expect(grid.slice(0, 3)).toEqual([null, null, null])
    expect(grid[3]).toBe('2026-07-01')
    expect(grid[grid.length - 2]).toBe('2026-07-31') // Friday, one trailing null
    expect(grid.filter(Boolean)).toHaveLength(31)
  })

  it('handles leap February', () => {
    const grid = monthGrid(2024, 1)
    expect(grid.filter(Boolean)).toHaveLength(29)
    expect(grid).toContain('2024-02-29')
  })

  it('handles a month starting on Sunday with no leading nulls', () => {
    const grid = monthGrid(2026, 1) // Feb 2026 starts on a Sunday
    expect(grid[0]).toBe('2026-02-01')
    expect(grid.filter(Boolean)).toHaveLength(28)
    expect(grid.length).toBe(28)
  })
})
