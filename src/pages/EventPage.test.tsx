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
  imageUrl: '',
  kind: 'dates',
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
    submitterAvatarUrl: 'https://example.com/grace.png',
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
    submitterAvatarUrl: '',
    dates: ['2026-08-01', '2026-08-02'],
    created: '',
    updated: '',
  },
]

const getFirstListItem = vi.fn()
const getFullList = vi.fn()
const create = vi.fn()
const update = vi.fn()
const loginAsGuest = vi.fn()
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
  useAuth: () => ({
    user: mockUser,
    isGuest: mockUser?.guest === true,
    loginAsGuest,
  }),
}))

const openLogin = vi.fn()

vi.mock('@/lib/login-dialog', () => ({
  useLoginDialog: () => ({ openLogin }),
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

  it('defaults to the calendar heatmap with the best-day recommendation', async () => {
    renderPage()
    expect(await screen.findByText('Summer BBQ')).toBeInTheDocument()
    expect(
      screen.getByText('Sun, Aug 2 works best — 2 of 2 people can make it.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Sun, Aug 2 — 2 of 2 available (best day)',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Organized by Ada Lovelace/)).toBeInTheDocument()
  })

  it('switches to the list view with counts via the toggle', async () => {
    renderPage()
    await screen.findByText('Summer BBQ')
    fireEvent.click(screen.getByRole('button', { name: 'List' }))
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
    expect(screen.getByText('0/2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }))
    expect(screen.queryByText('1/2')).not.toBeInTheDocument()
    expect(screen.getByText('August 2026')).toBeInTheDocument()
  })

  it('offers guest responses with a name field when signed out', async () => {
    renderPage()
    expect(await screen.findByLabelText('Your name')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Sign in instead' }),
    ).toBeInTheDocument()
  })

  it('requires a non-empty name before saving as guest', async () => {
    renderPage()
    await screen.findByText('Summer BBQ')
    expect(screen.getByLabelText('Your name')).toBeRequired()
    // whitespace passes native `required`; the trim check still blocks it
    fireEvent.change(screen.getByLabelText('Your name'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    expect(await screen.findByText(/Enter your name/)).toBeInTheDocument()
    expect(loginAsGuest).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('renders an external image link directly', async () => {
    getFirstListItem.mockResolvedValue({
      ...EVENT,
      imageUrl: 'https://example.com/pic.jpg',
    })
    renderPage()
    await screen.findByText('Summer BBQ')
    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      'https://example.com/pic.jpg',
    )
  })

  it('creates a guest identity and submits in one save', async () => {
    loginAsGuest.mockResolvedValue(undefined)
    create.mockResolvedValue({})
    renderPage()
    await screen.findByText('Summer BBQ')
    fireEvent.change(screen.getByLabelText('Your name'), {
      target: { value: 'Guest Gal' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sat, Aug 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(loginAsGuest).toHaveBeenCalledWith('Guest Gal')
    const payload = create.mock.calls[0][0] as Record<string, string>
    expect(JSON.parse(payload.dates)).toEqual(['2026-08-01'])
  })

  it('skips the name field on anonymous events and saves a nameless guest', async () => {
    getFirstListItem.mockResolvedValue({ ...EVENT, hideNames: true })
    loginAsGuest.mockResolvedValue(undefined)
    create.mockResolvedValue({})
    renderPage()
    await screen.findByText('Summer BBQ')
    expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument()
    expect(screen.getByText(/your response is anonymous/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sat, Aug 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(loginAsGuest).toHaveBeenCalledWith('')
  })

  it('leaves a guest name untouched when responding anonymously', async () => {
    getFirstListItem.mockResolvedValue({ ...EVENT, hideNames: true })
    mockUser = {
      id: 'user-guest',
      guest: true,
      name: 'Gus',
    } as unknown as AuthRecord
    create.mockResolvedValue({})
    renderPage()
    await screen.findByText('Summer BBQ')
    expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sat, Aug 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(update).not.toHaveBeenCalled()
  })

  it('lets a returning guest clear their name back to Anonymous', async () => {
    mockUser = {
      id: 'user-guest',
      guest: true,
      name: 'Gus',
    } as unknown as AuthRecord
    update.mockResolvedValue({})
    create.mockResolvedValue({})
    renderPage()
    await screen.findByText('Summer BBQ')
    const field = screen.getByLabelText('Your name')
    expect(field).toHaveValue('Gus')
    expect(field).not.toBeRequired()
    expect(
      screen.getByText(/Leave blank to respond as Anonymous/),
    ).toBeVisible()
    fireEvent.change(field, { target: { value: '  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sat, Aug 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(update).toHaveBeenCalledWith('user-guest', { name: '' })
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(
      create.mock.invocationCallOrder[0],
    )
  })

  it('lets a returning guest rename themselves', async () => {
    mockUser = {
      id: 'user-guest',
      guest: true,
      name: 'Gus',
    } as unknown as AuthRecord
    update.mockResolvedValue({})
    create.mockResolvedValue({})
    renderPage()
    await screen.findByText('Summer BBQ')
    fireEvent.change(screen.getByLabelText('Your name'), {
      target: { value: ' Augustus ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sat, Aug 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(update).toHaveBeenCalledWith('user-guest', { name: 'Augustus' })
  })

  it('skips the user update when a returning guest keeps their name', async () => {
    mockUser = {
      id: 'user-guest',
      guest: true,
      name: 'Gus',
    } as unknown as AuthRecord
    create.mockResolvedValue({})
    renderPage()
    await screen.findByText('Summer BBQ')
    fireEvent.click(screen.getByRole('button', { name: 'Sat, Aug 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(update).not.toHaveBeenCalled()
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
    fireEvent.click(screen.getByRole('button', { name: 'Sat, Aug 1' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Mon, Aug 3' }))
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

  it('renders avatar images for submitters that have one', async () => {
    renderPage()
    await screen.findByText('Summer BBQ')
    const grace = screen.getByRole('button', { name: 'Grace Hopper' })
    expect(grace.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/grace.png',
    )
    const alan = screen.getByRole('button', { name: 'Alan Turing' })
    expect(alan.querySelector('img')).not.toBeInTheDocument()
    expect(alan).toHaveTextContent('AT')
  })

  it('renders hidden-names submissions without chips', async () => {
    // the enrich hook hides submitterAvatarUrl whenever it hides submitterName
    getFullList.mockResolvedValue(
      SUBMISSIONS.map((submission) => ({
        ...submission,
        submitterName: '',
        submitterAvatarUrl: '',
      })),
    )
    renderPage()
    await screen.findByText('Summer BBQ')
    expect(screen.getByText('2 responses (names hidden)')).toBeInTheDocument()
    expect(document.querySelector('img')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'List' }))
    expect(
      screen.queryByRole('button', { name: 'Name hidden' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })

  it('polls days of the week on weekday events', async () => {
    mockUser = { id: 'user-new' } as AuthRecord
    create.mockResolvedValue({})
    getFirstListItem.mockResolvedValue({
      ...EVENT,
      kind: 'weekdays',
      dates: ['mon', 'wed', 'fri'],
    })
    getFullList.mockResolvedValue([
      { ...SUBMISSIONS[0], dates: ['wed'] },
      { ...SUBMISSIONS[1], dates: ['mon', 'wed'] },
    ])
    renderPage()
    await screen.findByText('Summer BBQ')
    expect(screen.getByText(/3 days of the week/)).toBeInTheDocument()
    expect(
      screen.getByText('Wednesday works best — 2 of 2 people can make it.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Friday' }))
    fireEvent.click(screen.getByRole('button', { name: 'Monday' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    const payload = create.mock.calls[0][0] as Record<string, string>
    expect(JSON.parse(payload.dates)).toEqual(['mon', 'fri'])
    expect(
      screen.queryByRole('button', { name: /Add .* to calendar/ }),
    ).not.toBeInTheDocument()
  })

  it('shows weekday results as a list with no calendar toggle', async () => {
    getFirstListItem.mockResolvedValue({
      ...EVENT,
      kind: 'weekdays',
      dates: ['mon', 'wed', 'fri'],
    })
    getFullList.mockResolvedValue([
      { ...SUBMISSIONS[0], dates: ['wed'] },
      { ...SUBMISSIONS[1], dates: ['mon', 'wed'] },
    ])
    renderPage()
    await screen.findByText('Summer BBQ')
    expect(
      screen.queryByRole('group', { name: 'Results view' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Calendar' }),
    ).not.toBeInTheDocument()
    // list view counts render straight away
    expect(screen.getByText('2/2')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Add .* to calendar/ }),
    ).not.toBeInTheDocument()
  })
})
