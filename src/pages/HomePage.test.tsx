import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthRecord } from 'pocketbase'
import { HomePage } from '@/pages/HomePage'

const getFullList = vi.fn()
const logout = vi.fn()
const confirmGuestLogout = vi.fn()
let mockUser: AuthRecord | null = null
let mockIsGuest = false

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: () => ({ getFullList }),
    filter: (raw: string) => raw,
  },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: mockUser, isGuest: mockIsGuest, logout }),
  confirmGuestLogout: (...args: unknown[]) => confirmGuestLogout(...args),
}))

function renderPage() {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = null
    mockIsGuest = false
  })

  it('renders the hero and create CTA when signed out', () => {
    renderPage()
    expect(screen.getByText('Find a day that works')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Create an event/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('Propose some days')).toBeInTheDocument()
    expect(getFullList).not.toHaveBeenCalled()
  })

  it('lists your events and responses when signed in', async () => {
    mockUser = { id: 'me' } as AuthRecord
    getFullList
      .mockResolvedValueOnce([
        {
          id: 'e1',
          title: 'Summer BBQ',
          slug: 'summer-bbq',
          dates: ['2026-08-01', '2026-08-02'],
          creator: 'me',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 's1',
          dates: ['2026-09-01'],
          expand: {
            event: {
              id: 'e2',
              title: 'Board games night',
              slug: '',
              dates: ['2026-09-01', '2026-09-02'],
              creator: 'someone-else',
            },
          },
        },
      ])
    renderPage()
    expect(await screen.findByText('Summer BBQ')).toBeInTheDocument()
    expect(screen.getByText('Board games night')).toBeInTheDocument()
    expect(screen.getByText('1 of 2 days work for you')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Summer BBQ/ })).toHaveAttribute(
      'href',
      '/events/summer-bbq',
    )
    expect(
      screen.getByRole('link', { name: /Board games night/ }),
    ).toHaveAttribute('href', '/events/e2')
  })

  it('shows nothing extra for a signed-in user with no activity', async () => {
    mockUser = { id: 'me' } as AuthRecord
    getFullList.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText('Find a day that works')).toBeInTheDocument()
    expect(screen.queryByText('Your events')).not.toBeInTheDocument()
    expect(screen.queryByText(/browsing as a guest/)).not.toBeInTheDocument()
  })

  it('nudges guests to sign in to keep their events', async () => {
    mockUser = { id: 'me' } as AuthRecord
    mockIsGuest = true
    getFullList.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(/browsing as a guest/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('erases the guest identity after confirmation', async () => {
    mockUser = { id: 'me' } as AuthRecord
    mockIsGuest = true
    getFullList.mockResolvedValue([])
    confirmGuestLogout.mockReturnValue(true)
    renderPage()
    fireEvent.click(
      await screen.findByRole('button', { name: /erase your guest identity/ }),
    )
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('keeps the guest identity when the confirm is declined', async () => {
    mockUser = { id: 'me' } as AuthRecord
    mockIsGuest = true
    getFullList.mockResolvedValue([])
    confirmGuestLogout.mockReturnValue(false)
    renderPage()
    fireEvent.click(
      await screen.findByRole('button', { name: /erase your guest identity/ }),
    )
    expect(logout).not.toHaveBeenCalled()
  })
})
