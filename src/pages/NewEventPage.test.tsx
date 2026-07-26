import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NewEventPage } from '@/pages/NewEventPage'

const create = vi.fn()
const navigate = vi.fn()

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: () => ({ create }),
    files: { getURL: () => '' },
  },
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
})
