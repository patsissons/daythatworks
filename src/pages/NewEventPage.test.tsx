import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientResponseError } from 'pocketbase'
import { NewEventPage } from '@/pages/NewEventPage'

const create = vi.fn()
const navigate = vi.fn()
const loginAsGuest = vi.fn()

const auth = {
  user: { id: 'user1', name: 'Pat' } as Record<string, unknown> | null,
  isGuest: false,
}

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: () => ({ create }),
    files: { getURL: () => '' },
  },
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: auth.user,
    isGuest: auth.isGuest,
    loginAsGuest,
  }),
}))

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

function renderPage() {
  render(
    <MemoryRouter>
      <NewEventPage />
    </MemoryRouter>,
  )
}

async function pickTwoDates() {
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  const days = screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-label')?.match(/^\d{4}-/))
    .filter((button) => !button.hasAttribute('disabled'))
  fireEvent.click(days[0])
  fireEvent.click(days[1])
  return [
    days[0].getAttribute('aria-label')!,
    days[1].getAttribute('aria-label')!,
  ]
}

describe('NewEventPage', () => {
  beforeEach(() => {
    create.mockReset()
    navigate.mockReset()
    loginAsGuest.mockReset()
    auth.user = { id: 'user1', name: 'Pat' }
    auth.isGuest = false
  })

  it('blocks submit until at least 2 dates are picked', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Summer BBQ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create event' }))
    expect(
      await screen.findByText('Pick at least 2 candidate dates.'),
    ).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('creates the event with a ulid id and navigates to its page', async () => {
    create.mockResolvedValue({ id: 'x'.repeat(26), slug: 'summer-bbq' })
    renderPage()
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Summer BBQ' },
    })
    fireEvent.change(screen.getByLabelText(/Custom link/), {
      target: { value: 'summer-bbq' },
    })
    const picked = await pickTwoDates()
    fireEvent.click(screen.getByRole('button', { name: 'Create event' }))

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    const form = create.mock.calls[0][0] as FormData
    expect(form.get('id')).toMatch(/^[0-9a-z]{26}$/)
    expect(form.get('title')).toBe('Summer BBQ')
    expect(form.get('slug')).toBe('summer-bbq')
    expect(JSON.parse(form.get('dates') as string)).toEqual(picked.sort())
    expect(form.get('hideNames')).toBe('false')
    expect(navigate).toHaveBeenCalledWith('/events/summer-bbq')
  })

  it('rejects an invalid slug before hitting the API', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Summer BBQ' },
    })
    fireEvent.change(screen.getByLabelText(/Custom link/), {
      target: { value: 'Not A Slug!' },
    })
    await pickTwoDates()
    fireEvent.click(screen.getByRole('button', { name: 'Create event' }))
    expect(
      await screen.findByText(/Slugs are lowercase letters/),
    ).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('hides the name field for signed-in full accounts', () => {
    renderPage()
    expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument()
  })

  it('requires a non-empty name when signed out', async () => {
    auth.user = null
    renderPage()
    expect(screen.getByLabelText('Your name')).toBeRequired()
    // whitespace passes native `required`; the trim check still blocks it
    fireEvent.change(screen.getByLabelText('Your name'), {
      target: { value: '   ' },
    })
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Summer BBQ' },
    })
    await pickTwoDates()
    fireEvent.click(screen.getByRole('button', { name: 'Create event' }))
    expect(await screen.findByText(/Enter your name/)).toBeInTheDocument()
    expect(loginAsGuest).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('mints a guest before creating when signed out', async () => {
    auth.user = null
    create.mockResolvedValue({ id: 'x'.repeat(26), slug: '' })
    renderPage()
    fireEvent.change(screen.getByLabelText('Your name'), {
      target: { value: 'Alex' },
    })
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Summer BBQ' },
    })
    await pickTwoDates()
    fireEvent.click(screen.getByRole('button', { name: 'Create event' }))

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(loginAsGuest).toHaveBeenCalledWith('Alex')
    expect(loginAsGuest.mock.invocationCallOrder[0]).toBeLessThan(
      create.mock.invocationCallOrder[0],
    )
  })

  it('surfaces the server rate-limit message on 429', async () => {
    auth.user = null
    create.mockRejectedValue(
      new ClientResponseError({
        status: 429,
        response: {
          message:
            'Guest event limit reached — try again tomorrow, or sign in to create more events.',
        },
      }),
    )
    renderPage()
    fireEvent.change(screen.getByLabelText('Your name'), {
      target: { value: 'Alex' },
    })
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Summer BBQ' },
    })
    await pickTwoDates()
    fireEvent.click(screen.getByRole('button', { name: 'Create event' }))
    expect(
      await screen.findByText(/Guest event limit reached/),
    ).toBeInTheDocument()
  })
})
