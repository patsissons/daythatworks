import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ISO_DATE_PATTERN } from '@/lib/dates'

// Like og.test.ts: a PocketBase JSVM CommonJS module evaluated in an explicit
// CJS wrapper. Only the pure helpers are exercised here — seedTestEvents needs
// a live PocketBase app.
const code = readFileSync('pb_hooks/lib/dev-seed.js', 'utf8')
const moduleRef = { exports: {} }
new Function('module', 'exports', code)(moduleRef, moduleRef.exports)
const seed = moduleRef.exports as {
  SLUG: string
  WEEKLY_SLUG: string
  WEEKLY_DAYS: string[]
  newId: () => string
  isoInDays: (now: Date, days: number) => string
  seedDates: (now: Date) => string[]
}

describe('dev-seed helpers', () => {
  it('reserves the /events/test and /events/test-weekly slugs', () => {
    expect(seed.SLUG).toBe('test')
    expect(seed.WEEKLY_SLUG).toBe('test-weekly')
  })

  it('seeds a valid, Sunday-first set of weekdays', () => {
    const order = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    expect(seed.WEEKLY_DAYS.length).toBeGreaterThanOrEqual(2)
    const indexes = seed.WEEKLY_DAYS.map((day) => order.indexOf(day))
    expect(indexes.every((index) => index >= 0)).toBe(true)
    expect([...indexes].sort((a, b) => a - b)).toEqual(indexes)
  })

  it('generates 26-char lowercase ids like the app', () => {
    for (let i = 0; i < 20; i++) {
      expect(seed.newId()).toMatch(/^[0-9a-z]{26}$/)
    }
  })

  it('builds ISO dates relative to now, across month boundaries', () => {
    const now = new Date(2026, 7, 30, 9) // Aug 30
    expect(seed.isoInDays(now, 0)).toBe('2026-08-30')
    expect(seed.isoInDays(now, 2)).toBe('2026-09-01')
  })

  it('seeds enough valid future dates for an event', () => {
    const now = new Date(2026, 11, 30, 9)
    const dates = seed.seedDates(now)
    expect(dates.length).toBeGreaterThanOrEqual(2)
    const today = '2026-12-30'
    for (const date of dates) {
      expect(date).toMatch(ISO_DATE_PATTERN)
      expect(date > today).toBe(true)
    }
    expect([...dates].sort()).toEqual(dates)
  })
})
