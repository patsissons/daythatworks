import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthRecord } from 'pocketbase'
import { Layout } from '@/components/Layout'

let mockUser: AuthRecord | null = null

vi.mock('@/lib/auth', () => ({
  confirmGuestLogout: () => true,
  useAuth: () => ({
    user: mockUser,
    isGuest: mockUser?.guest === true,
    logout: vi.fn(),
  }),
}))

vi.mock('@/lib/login-dialog', () => ({
  useLoginDialog: () => ({ openLogin: vi.fn() }),
}))

function renderLayout() {
  render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  beforeEach(() => {
    mockUser = null
  })

  it('shows the signed-in name', () => {
    mockUser = {
      id: 'u1',
      name: 'Ada',
      email: 'ada@example.com',
    } as unknown as AuthRecord
    renderLayout()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('shows only the guest badge for a nameless guest, never the synthetic email', () => {
    mockUser = {
      id: 'u2',
      name: '',
      guest: true,
      email: 'guest-abc@guest.daythatworks.com',
    } as unknown as AuthRecord
    renderLayout()
    expect(screen.getByText('guest')).toBeInTheDocument()
    expect(screen.queryByText('Guest')).toBeNull()
    expect(screen.queryByText(/@guest\.daythatworks\.com/)).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Forget me' }),
    ).toBeInTheDocument()
  })
})
