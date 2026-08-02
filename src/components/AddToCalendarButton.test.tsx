import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AddToCalendarButton } from '@/components/AddToCalendarButton'

const EVENT = {
  id: '01arz3ndektsv4rrffq69g5fav',
  title: 'Summer BBQ',
  description: 'Bring snacks',
  slug: 'summer-bbq',
}

function openMenu() {
  render(<AddToCalendarButton event={EVENT} date="2026-08-15" />)
  fireEvent.click(
    screen.getByRole('button', { name: 'Add Sat, Aug 15 to calendar' }),
  )
}

describe('AddToCalendarButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('offers a Google Calendar link for the day', async () => {
    openMenu()
    const link = await screen.findByRole('link', { name: /Google Calendar/ })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    const href = new URL(link.getAttribute('href') ?? '')
    expect(href.origin + href.pathname).toBe(
      'https://calendar.google.com/calendar/render',
    )
    expect(href.searchParams.get('dates')).toBe('20260815/20260816')
    expect(href.searchParams.get('details')).toContain('/events/summer-bbq')
  })

  it('offers an Outlook.com link for the day', async () => {
    openMenu()
    const link = await screen.findByRole('link', { name: /Outlook\.com/ })
    const href = new URL(link.getAttribute('href') ?? '')
    expect(href.hostname).toBe('outlook.live.com')
    expect(href.searchParams.get('allday')).toBe('true')
    expect(href.searchParams.get('startdt')).toBe('2026-08-15')
  })

  it('downloads an .ics file for Apple Calendar', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    openMenu()
    fireEvent.click(
      await screen.findByRole('button', { name: /Apple Calendar/ }),
    )
    expect(createObjectURL).toHaveBeenCalledOnce()
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /Apple Calendar/ }),
      ).not.toBeInTheDocument(),
    )
  })

  it('states the write-only privacy promise', async () => {
    openMenu()
    expect(
      await screen.findByText(/we never read your calendar/),
    ).toBeInTheDocument()
  })
})
