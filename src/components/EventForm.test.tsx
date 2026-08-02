import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventForm } from '@/components/EventForm'
import type { EventsRecord } from '@/lib/pocketbase-types'

const isSlugTaken = vi.fn()
const onSubmit = vi.fn()

vi.mock('@/lib/events', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/events')>()),
  isSlugTaken: (...args: unknown[]) => isSlugTaken(...args),
}))

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    files: { getURL: () => 'http://test/legacy-file.png' },
  },
}))

const INITIAL: EventsRecord = {
  id: 'e'.repeat(26),
  title: 'Summer BBQ',
  slug: 'summer-bbq',
  description: '',
  image: '',
  imageUrl: '',
  dates: ['2026-08-01', '2026-08-02'],
  hideNames: false,
  creator: 'me',
  creatorName: '',
  creatorEmail: '',
  created: '',
  updated: '',
}

function renderForm(initial?: EventsRecord) {
  render(<EventForm initial={initial} submitLabel="Save" onSubmit={onSubmit} />)
}

async function pickTwoDates() {
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  const days = screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-label')?.match(/^\d{4}-/))
    .filter((button) => !button.hasAttribute('disabled'))
  fireEvent.click(days[0])
  fireEvent.click(days[1])
}

async function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: 'Summer BBQ' },
  })
  await pickTwoDates()
}

describe('EventForm slug availability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    onSubmit.mockResolvedValue(undefined)
  })

  it('shows available feedback on blur', async () => {
    isSlugTaken.mockResolvedValue(false)
    renderForm()
    const input = screen.getByLabelText(/Custom link/)
    fireEvent.change(input, { target: { value: 'summer-bbq' } })
    fireEvent.blur(input)
    expect(
      await screen.findByText('✓ /events/summer-bbq is available'),
    ).toBeInTheDocument()
    expect(isSlugTaken).toHaveBeenCalledWith('summer-bbq', undefined)
  })

  it('shows taken feedback and blocks submit', async () => {
    isSlugTaken.mockResolvedValue(true)
    renderForm()
    await fillValidForm()
    const input = screen.getByLabelText(/Custom link/)
    fireEvent.change(input, { target: { value: 'summer-bbq' } })
    fireEvent.blur(input)
    expect(await screen.findByText(/That link is taken/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(screen.getAllByText(/That link is taken/).length).toBeGreaterThan(
        0,
      ),
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('resets feedback while typing', async () => {
    isSlugTaken.mockResolvedValue(true)
    renderForm()
    const input = screen.getByLabelText(/Custom link/)
    fireEvent.change(input, { target: { value: 'summer-bbq' } })
    fireEvent.blur(input)
    await screen.findByText(/That link is taken/)
    fireEvent.change(input, { target: { value: 'summer-bbq-2' } })
    expect(screen.queryByText(/That link is taken/)).not.toBeInTheDocument()
  })

  it('flags invalid formats inline without querying', async () => {
    renderForm()
    const input = screen.getByLabelText(/Custom link/)
    fireEvent.change(input, { target: { value: 'Not A Slug!' } })
    fireEvent.blur(input)
    expect(
      await screen.findByText(/Slugs are lowercase letters/),
    ).toBeInTheDocument()
    expect(isSlugTaken).not.toHaveBeenCalled()
  })

  it('skips the check for the event being edited with its own slug', () => {
    renderForm(INITIAL)
    const input = screen.getByLabelText(/Custom link/)
    fireEvent.blur(input)
    expect(isSlugTaken).not.toHaveBeenCalled()
  })

  it('does not block submit while a check is in flight', async () => {
    isSlugTaken.mockReturnValue(new Promise(() => undefined))
    renderForm()
    await fillValidForm()
    const input = screen.getByLabelText(/Custom link/)
    fireEvent.change(input, { target: { value: 'summer-bbq' } })
    fireEvent.blur(input)
    expect(await screen.findByText(/Checking availability/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })
})

describe('EventForm image FormData', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    onSubmit.mockResolvedValue(undefined)
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        set src(value: string) {
          if (value) queueMicrotask(() => this.onload?.())
        }
      },
    )
  })

  it('sends the file and clears imageUrl for uploads', async () => {
    renderForm()
    await fillValidForm()
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText(/Add an image/), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const form = onSubmit.mock.calls[0][0] as FormData
    expect(form.get('image')).toBe(file)
    expect(form.get('imageUrl')).toBe('')
  })

  it('sends the verified link and clears the file for URLs', async () => {
    renderForm()
    await fillValidForm()
    const urlInput = screen.getByLabelText('Image link')
    fireEvent.change(urlInput, { target: { value: 'https://x/good.png' } })
    fireEvent.blur(urlInput)
    await screen.findByText(/Image link looks good/)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const form = onSubmit.mock.calls[0][0] as FormData
    expect(form.get('imageUrl')).toBe('https://x/good.png')
    expect(form.get('image')).toBe('')
  })

  it('clears both fields on remove', async () => {
    renderForm({ ...INITIAL, imageUrl: 'https://x/old.png' })
    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const form = onSubmit.mock.calls[0][0] as FormData
    expect(form.get('image')).toBe('')
    expect(form.get('imageUrl')).toBe('')
  })

  it('sends neither image key when untouched', async () => {
    renderForm(INITIAL)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const form = onSubmit.mock.calls[0][0] as FormData
    expect(form.has('image')).toBe(false)
    expect(form.has('imageUrl')).toBe(false)
  })

  it('blocks submit while an image link errored', async () => {
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        set src(value: string) {
          if (value) queueMicrotask(() => this.onerror?.())
        }
      },
    )
    renderForm()
    await fillValidForm()
    const urlInput = screen.getByLabelText('Image link')
    fireEvent.change(urlInput, { target: { value: 'https://x/broken.png' } })
    fireEvent.blur(urlInput)
    await screen.findByText(/doesn't load as an image/)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      await screen.findByText('Check the image link before saving.'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
