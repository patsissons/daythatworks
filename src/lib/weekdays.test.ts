import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  formatOption,
  formatWeekdayList,
  isWeekdayEvent,
} from '@/lib/weekdays'

describe('weekday helpers', () => {
  it('labels every token', () => {
    for (const day of WEEKDAYS) {
      expect(WEEKDAY_LABELS[day]).toBeDefined()
    }
  })

  it('formats options per event kind', () => {
    expect(formatOption('weekdays', 'tue')).toBe('Tuesday')
    expect(formatOption('dates', '2026-07-25')).toBe('Sat, Jul 25')
    expect(formatOption('', '2026-07-25')).toBe('Sat, Jul 25')
  })

  it('lists weekdays compactly', () => {
    expect(formatWeekdayList(['mon', 'wed', 'fri'])).toBe('Mon, Wed, Fri')
  })

  it('detects weekday events, treating an empty kind as dates', () => {
    expect(isWeekdayEvent({ kind: 'weekdays' })).toBe(true)
    expect(isWeekdayEvent({ kind: 'dates' })).toBe(false)
    expect(isWeekdayEvent({ kind: '' })).toBe(false)
  })

  it('stays in sync with the server-side list in pb_hooks/lib/records.js', () => {
    const code = readFileSync('pb_hooks/lib/records.js', 'utf8')
    const match = code.match(/const WEEKDAYS = (\[[^\]]*\])/)
    expect(match).not.toBeNull()
    expect(JSON.parse(match![1].replaceAll("'", '"'))).toEqual(WEEKDAYS)
  })
})
