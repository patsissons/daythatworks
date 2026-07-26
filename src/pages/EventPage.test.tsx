import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthRecord } from 'pocketbase'
import { EventPage } from '@/pages/EventPage'
import type { EventsRecord, SubmissionsRecord } from '@/lib/pocketbase-types'

const EVENT: EventsRecord = {
  id: '01hv3x7z9k4m8n2p5q6r7s8t9v',
  title: 'Summer BBQ',
  slug: 'summer-bbq',
  description: 'Bring snacks',
  image: '',
  dates: ['2026-08-01', '2026-08-02', '2026-08-03'],
  hideNames: false,
  creator: 'user-creator',
  creatorName: 'Ada Lovelace',
  creatorEmail: '',
  created: '',
  updated: '',
}

const SUBMISSIONS: SubmissionsRecord[] = [
  {
    id: 'sub1'.padEnd(26, '0'),
    event: EVENT.id,
    submitter: 'user-grace',
    submitterName: 'Grace Hopper',
    submitterEmail: '',
    dates: ['2026-08-02'],
    created: '',
    updated: '',
  },
  {
    id: 'sub2'.padEnd(26, '0'),
    event: EVENT.id,
    submitter: 'user-alan',
    submitterName: 'Alan Turing',
    submitterEmail: '',
    dates: ['2026-08-01', '2026-08-02'],
    created: '',
    updated: '',
  },
]

const getFirstListItem = vi.fn()
const getFullList = vi.fn()
const create = vi.fn()
const update = vi.fn()
let mockUser: AuthRecord | null = null

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: (name: string) =>
      name === 'events'
        ? { getFirstListItem }
        : { getFullList, create, update },
    filter: (raw: string) => raw,
    files: { getURL: () => 'http://test/image.png' },
  },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

function renderPage(path = '/events/summer-bbq') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="events/:idOrSlug" element={<EventPage />} />
        <Route
          path="events/:idOrSlug/s/:submissionId"
          element={<EventPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EventPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = null
    getFirstListItem.mockResolvedValue(EVENT)
    getFullList.mockResolvedValue(SUBMISSIONS)
  })

  it('renders results with counts and the best-day recommendation', async () => {
    renderPage()
    expect(await screen.findByText('Summer BBQ')).toBeInTheDocument()
    expect(
      screen.getByText('Sun, Aug 2 works best — 2 of 2 people can make it.'),
    ).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
    expect(screen.getByText('0/2')).toBeInTheDocument()
    expect(screen.getByText(/Organized by Ada Lovelace/)).toBeInTheDocument()
  })

  it('shows a sign-in prompt when signed out', async () => {
    renderPage()
    expect(
      await screen.findByRole('link', { name: 'Sign in to respond' }),
    ).toBeInTheDocument()
  })

  it('shows a not-found card for unknown events', async () => {
    getFirstListItem.mockRejectedValue({ status: 404 })
    renderPage('/events/nope')
    expect(await screen.findByText('Event not found')).toBeInTheDocument()
  })

  it('creates a new submission with a ulid id', async () => {
    mockUser = { id: 'user-new' } as AuthRecord
    create.mockResolvedValue({})
    renderPage()
    await screen.findByText('Summer BBQ')
    fireEvent.click(screen.getByRole('button', { name: /Sat, Aug 1/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    const payload = create.mock.calls[0][0] as Record<string, string>
    expect(payload.id).toMatch(/^[0-9a-z]{26}$/)
    expect(payload.event).toBe(EVENT.id)
    expect(JSON.parse(payload.dates)).toEqual(['2026-08-01'])
    expect(
      await screen.findByRole('button', { name: /Copy your response link/ }),
    ).toBeInTheDocument()
  })

  it('updates the existing submission for a returning member', async () => {
    mockUser = { id: 'user-grace' } as AuthRecord
    update.mockResolvedValue({})
    renderPage()
    await screen.findByText('Summer BBQ')
    const updateButton = screen.getByRole('button', {
      name: 'Update availability',
    })
    fireEvent.click(screen.getByRole('button', { name: /Mon, Aug 3/ }))
    fireEvent.click(updateButton)
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(update.mock.calls[0][0]).toBe(SUBMISSIONS[0].id)
    expect(
      JSON.parse((update.mock.calls[0][1] as { dates: string }).dates),
    ).toEqual(['2026-08-02', '2026-08-03'])
    expect(create).not.toHaveBeenCalled()
  })

  it('shows the Edit button only to the creator', async () => {
    mockUser = { id: 'user-creator' } as AuthRecord
    renderPage()
    await screen.findByText('Summer BBQ')
    expect(screen.getByRole('link', { name: /Edit/ })).toBeInTheDocument()
  })

  it('renders hidden-names submissions without chips', async () => {
    getFullList.mockResolvedValue(
      SUBMISSIONS.map((submission) => ({ ...submission, submitterName: '' })),
    )
    renderPage()
    await screen.findByText('Summer BBQ')
    expect(screen.queryByTitle('Hidden')).not.toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })
})
