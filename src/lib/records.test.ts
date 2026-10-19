import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Like og.test.ts: the record-hook helpers are a PocketBase JSVM CommonJS
// module, evaluated in an explicit CJS wrapper with the JSVM's error global
// stubbed.
class BadRequestError extends Error {}
const code = readFileSync('pb_hooks/lib/records.js', 'utf8')
const moduleRef = { exports: {} }
new Function('module', 'exports', 'BadRequestError', code)(
  moduleRef,
  moduleRef.exports,
  BadRequestError,
)
const records = moduleRef.exports as {
  normalizeDates: (values: unknown[]) => string[]
  normalizeWeekdays: (values: unknown[]) => string[]
  isWeekdayKind: (kind: string) => boolean
  normalizeOptions: (kind: string, values: unknown[]) => string[]
}

describe('normalizeWeekdays', () => {
  it('dedupes and orders tokens Sunday-first, not alphabetically', () => {
    expect(records.normalizeWeekdays(['sat', 'mon', 'sun', 'mon'])).toEqual([
      'sun',
      'mon',
      'sat',
    ])
  })

  it('rejects unknown tokens and dates', () => {
    expect(() => records.normalizeWeekdays(['funday'])).toThrow(BadRequestError)
    expect(() => records.normalizeWeekdays(['2026-10-20'])).toThrow(
      BadRequestError,
    )
    expect(() => records.normalizeWeekdays([3])).toThrow(BadRequestError)
  })
})

describe('normalizeOptions', () => {
  it('treats only the weekdays kind as weekday options', () => {
    expect(records.isWeekdayKind('weekdays')).toBe(true)
    expect(records.isWeekdayKind('dates')).toBe(false)
    expect(records.isWeekdayKind('')).toBe(false)
  })

  it('validates weekday events as weekdays', () => {
    expect(records.normalizeOptions('weekdays', ['fri', 'tue'])).toEqual([
      'tue',
      'fri',
    ])
    expect(() => records.normalizeOptions('weekdays', ['2026-10-20'])).toThrow(
      BadRequestError,
    )
  })

  it('validates date (and legacy empty-kind) events as ISO dates', () => {
    for (const kind of ['dates', '']) {
      expect(
        records.normalizeOptions(kind, ['2026-10-21', '2026-10-20']),
      ).toEqual(['2026-10-20', '2026-10-21'])
      expect(() => records.normalizeOptions(kind, ['mon'])).toThrow(
        BadRequestError,
      )
    }
  })
})
