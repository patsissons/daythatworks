import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildICS,
  downloadICS,
  googleCalendarUrl,
  icsFilename,
  outlookCalendarUrl,
} from '@/lib/calendar-links'

const EVENT = {
  eventId: '01arz3ndektsv4rrffq69g5fav',
  title: 'Summer BBQ',
  description: 'Bring snacks & drinks',
  date: '2026-08-15',
  url: 'https://daythatworks.com/events/summer-bbq',
}

describe('googleCalendarUrl', () => {
  it('builds a template link with an exclusive all-day range', () => {
    const url = new URL(googleCalendarUrl(EVENT))
    expect(url.origin + url.pathname).toBe(
      'https://calendar.google.com/calendar/render',
    )
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('text')).toBe('Summer BBQ')
    expect(url.searchParams.get('dates')).toBe('20260815/20260816')
    expect(url.searchParams.get('details')).toBe(
      'Bring snacks & drinks\n\nhttps://daythatworks.com/events/summer-bbq',
    )
  })

  it('spans month and year boundaries', () => {
    const url = new URL(googleCalendarUrl({ ...EVENT, date: '2026-12-31' }))
    expect(url.searchParams.get('dates')).toBe('20261231/20270101')
  })

  it('omits the description when the event has none', () => {
    const url = new URL(googleCalendarUrl({ ...EVENT, description: undefined }))
    expect(url.searchParams.get('details')).toBe(EVENT.url)
  })
})

describe('outlookCalendarUrl', () => {
  it('builds an all-day deeplink compose URL', () => {
    const url = new URL(outlookCalendarUrl(EVENT))
    expect(url.origin + url.pathname).toBe(
      'https://outlook.live.com/calendar/0/deeplink/compose',
    )
    expect(url.searchParams.get('allday')).toBe('true')
    expect(url.searchParams.get('startdt')).toBe('2026-08-15')
    expect(url.searchParams.get('enddt')).toBe('2026-08-16')
    expect(url.searchParams.get('subject')).toBe('Summer BBQ')
  })
})

describe('buildICS', () => {
  it('emits a CRLF-joined all-day VEVENT with a stable UID', () => {
    const ics = buildICS(EVENT)
    const lines = ics.split('\r\n')
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).not.toMatch(/[^\r]\n/)
    expect(lines).toContain(
      'UID:01arz3ndektsv4rrffq69g5fav-2026-08-15@daythatworks.com',
    )
    expect(lines).toContain('DTSTART;VALUE=DATE:20260815')
    expect(lines).toContain('DTEND;VALUE=DATE:20260816')
    expect(lines).toContain('SUMMARY:Summer BBQ')
    expect(lines).toContain('URL:https://daythatworks.com/events/summer-bbq')
    expect(lines.find((line) => line.startsWith('DTSTAMP:'))).toMatch(
      /^DTSTAMP:\d{8}T\d{6}Z$/,
    )
  })

  it('uses the next day as the exclusive end across a year boundary', () => {
    const ics = buildICS({ ...EVENT, date: '2026-12-31' })
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231')
    expect(ics).toContain('DTEND;VALUE=DATE:20270101')
  })

  it('escapes TEXT values per RFC 5545', () => {
    const ics = buildICS({
      ...EVENT,
      title: 'a;b,c\\d',
      description: 'line one\nline two',
    })
    expect(ics).toContain('SUMMARY:a\\;b\\,c\\\\d')
    expect(ics).toContain('DESCRIPTION:line one\\nline two')
  })

  it('omits DESCRIPTION when there is none', () => {
    expect(buildICS({ ...EVENT, description: undefined })).not.toContain(
      'DESCRIPTION',
    )
  })

  it('folds long lines at 75 octets with a continuation space', () => {
    const ics = buildICS({ ...EVENT, description: 'x'.repeat(300) })
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
    const unfolded = ics.replaceAll('\r\n ', '')
    expect(unfolded).toContain(`DESCRIPTION:${'x'.repeat(300)}`)
  })
})

describe('icsFilename', () => {
  it('slugifies the title and appends the date', () => {
    expect(icsFilename('Summer BBQ!', '2026-08-15')).toBe(
      'summer-bbq-2026-08-15.ics',
    )
  })

  it('falls back when the title has no usable characters', () => {
    expect(icsFilename('!!!', '2026-08-15')).toBe('event-2026-08-15.ics')
  })
})

describe('downloadICS', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('downloads a blob named after the event', () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    })
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    downloadICS(EVENT)

    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('text/calendar;charset=utf-8')
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    vi.unstubAllGlobals()
  })
})
