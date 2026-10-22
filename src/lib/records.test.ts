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
  isGuestAuth: (auth: unknown) => boolean
  guestName: (value: unknown) => string
  creatorNameFor: (auth: unknown, record: unknown) => string
  submitterNameFor: (auth: unknown, event: unknown, record: unknown) => string
}

/** A minimal stand-in for a JSVM record (auth, event, or submission). */
function fakeRecord(
  fields: Record<string, string | boolean> = {},
  collection = 'users',
) {
  return {
    collection: () => ({ name: collection }),
    getString: (name: string) => String(fields[name] ?? ''),
    getBool: (name: string) => fields[name] === true,
  }
}

const GUEST = fakeRecord({ name: 'Gus', guest: true })
const MEMBER = fakeRecord({ name: 'Ada Lovelace' })

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

describe('guest names', () => {
  it('recognizes only guest users', () => {
    expect(records.isGuestAuth(GUEST)).toBe(true)
    expect(records.isGuestAuth(MEMBER)).toBe(false)
    expect(records.isGuestAuth(null)).toBe(false)
    expect(
      records.isGuestAuth(fakeRecord({ guest: true }, '_superusers')),
    ).toBe(false)
  })

  it('trims guest names and caps their length', () => {
    expect(records.guestName('  Gus  ')).toBe('Gus')
    expect(records.guestName(undefined)).toBe('')
    expect(records.guestName('x'.repeat(100))).toHaveLength(100)
    expect(() => records.guestName('x'.repeat(101))).toThrow(BadRequestError)
  })

  it('lets guests name each event, but not full accounts', () => {
    const event = fakeRecord({ creatorName: ' Organizer Pat ' }, 'events')
    expect(records.creatorNameFor(GUEST, event)).toBe('Organizer Pat')
    expect(records.creatorNameFor(GUEST, fakeRecord({}, 'events'))).toBe('')
    expect(records.creatorNameFor(MEMBER, event)).toBe('Ada Lovelace')
  })

  it('lets guests name each response, but not full accounts', () => {
    const event = fakeRecord({ hideNames: false }, 'events')
    const response = fakeRecord({ submitterName: 'Just Pat' }, 'submissions')
    expect(records.submitterNameFor(GUEST, event, response)).toBe('Just Pat')
    expect(
      records.submitterNameFor(GUEST, event, fakeRecord({}, 'submissions')),
    ).toBe('')
    expect(records.submitterNameFor(MEMBER, event, response)).toBe(
      'Ada Lovelace',
    )
  })

  it('keeps guest responses anonymous on hideNames events', () => {
    const event = fakeRecord({ hideNames: true }, 'events')
    const response = fakeRecord({ submitterName: 'Just Pat' }, 'submissions')
    expect(records.submitterNameFor(GUEST, event, response)).toBe('')
    expect(records.submitterNameFor(MEMBER, event, response)).toBe(
      'Ada Lovelace',
    )
  })
})
