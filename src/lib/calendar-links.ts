// Write-only "add to calendar" helpers: prefilled compose links for Google
// Calendar and Outlook.com, and a client-generated .ics download for Apple
// Calendar / desktop clients. The app never reads anyone's calendar — nothing
// here talks to a calendar API; it only hands the user a link or a file.

import { addDays } from '@/lib/dates'
import { suggestSlug } from '@/lib/slug'

export interface CalendarDayEvent {
  /** Event ULID, used for a stable ICS UID. */
  eventId: string
  title: string
  description?: string
  /** ISO YYYY-MM-DD; calendar entries are all-day (the app is date-only). */
  date: string
  /** Absolute permalink back to the event page. */
  url: string
}

/** "2026-07-25" → "20260725" (the compact date form calendar URLs expect). */
function compactDate(iso: string): string {
  return iso.replaceAll('-', '')
}

/** Description body for compose links: event description, then the permalink. */
function linkDetails(input: CalendarDayEvent): string {
  return [input.description, input.url].filter(Boolean).join('\n\n')
}

export function googleCalendarUrl(input: CalendarDayEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    // all-day events use an exclusive end date
    dates: `${compactDate(input.date)}/${compactDate(addDays(input.date, 1))}`,
    details: linkDetails(input),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function outlookCalendarUrl(input: CalendarDayEvent): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    allday: 'true',
    startdt: input.date,
    enddt: addDays(input.date, 1),
    subject: input.title,
    body: linkDetails(input),
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/** Escape TEXT values per RFC 5545 (backslash, semicolon, comma, newline). */
function escapeICSText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Fold a content line at 75 octets with CRLF + space per RFC 5545. */
function foldICSLine(line: string): string {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const parts: string[] = []
  let start = 0
  while (start < bytes.length) {
    // 74 for continuations to leave room for the leading space
    let end = Math.min(start + (start === 0 ? 75 : 74), bytes.length)
    // never split inside a UTF-8 sequence (continuation bytes are 10xxxxxx)
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) {
      end--
    }
    parts.push(new TextDecoder().decode(bytes.slice(start, end)))
    start = end
  }
  return parts.join('\r\n ')
}

/** "20260802T173000Z" — UTC timestamp for DTSTAMP. */
function icsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

/** A single all-day VEVENT calendar file for Apple Calendar / desktop clients. */
export function buildICS(input: CalendarDayEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//daythatworks//Day that works//EN',
    'BEGIN:VEVENT',
    `UID:${input.eventId}-${input.date}@daythatworks.com`,
    `DTSTAMP:${icsTimestamp(new Date())}`,
    `DTSTART;VALUE=DATE:${compactDate(input.date)}`,
    // exclusive end date: the next day
    `DTEND;VALUE=DATE:${compactDate(addDays(input.date, 1))}`,
    `SUMMARY:${escapeICSText(input.title)}`,
  ]
  if (input.description) {
    lines.push(`DESCRIPTION:${escapeICSText(input.description)}`)
  }
  lines.push(`URL:${input.url}`, 'END:VEVENT', 'END:VCALENDAR')
  return lines.map(foldICSLine).join('\r\n') + '\r\n'
}

/** "Summer BBQ!" + "2026-08-15" → "summer-bbq-2026-08-15.ics" */
export function icsFilename(title: string, date: string): string {
  return `${suggestSlug(title) || 'event'}-${date}.ics`
}

/** Trigger a browser download of the .ics file for this day. */
export function downloadICS(input: CalendarDayEvent): void {
  const blob = new Blob([buildICS(input)], {
    type: 'text/calendar;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = icsFilename(input.title, input.date)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
