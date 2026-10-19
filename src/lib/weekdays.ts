// Weekday-event helpers. Events with kind 'weekdays' poll recurring days of
// the week instead of specific dates, storing 'sun'…'sat' tokens in the same
// `dates` field (always in this Sunday-first order).

import { formatDisplayDate } from '@/lib/dates'
import type { EventKind, EventsRecord } from '@/lib/pocketbase-types'

// Mirrored in pb_hooks/lib/records.js — src/lib/weekdays.test.ts keeps them
// in sync.
export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export const WEEKDAY_LABELS: Record<string, { short: string; long: string }> = {
  sun: { short: 'Sun', long: 'Sunday' },
  mon: { short: 'Mon', long: 'Monday' },
  tue: { short: 'Tue', long: 'Tuesday' },
  wed: { short: 'Wed', long: 'Wednesday' },
  thu: { short: 'Thu', long: 'Thursday' },
  fri: { short: 'Fri', long: 'Friday' },
  sat: { short: 'Sat', long: 'Saturday' },
}

/** True for events polling days of the week (empty kind means dates). */
export function isWeekdayEvent(event: Pick<EventsRecord, 'kind'>): boolean {
  return event.kind === 'weekdays'
}

/** Display label for one of an event's options: "Tuesday" or "Sat, Jul 25". */
export function formatOption(kind: EventKind, value: string): string {
  return kind === 'weekdays'
    ? (WEEKDAY_LABELS[value]?.long ?? value)
    : formatDisplayDate(value)
}

/** "Mon, Wed, Fri" */
export function formatWeekdayList(values: string[]): string {
  return values.map((value) => WEEKDAY_LABELS[value]?.short ?? value).join(', ')
}
