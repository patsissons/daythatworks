import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CopyLinkButton } from '@/components/CopyLinkButton'

const URL = 'https://example.com/events/summer-bbq'

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
  return writeText
}

describe('CopyLinkButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('copies the url and flashes Copied before resetting', async () => {
    const writeText = stubClipboard()
    render(<CopyLinkButton url={URL} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(writeText).toHaveBeenCalledWith(URL)
    expect(await screen.findByText('Copied')).toBeInTheDocument()
    vi.useFakeTimers()
    // the reset timer was armed before fake timers; re-copy under fake time
    fireEvent.click(screen.getByRole('button'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(screen.getByText('Copy link')).toBeInTheDocument()
  })

  it('supports a custom label', () => {
    stubClipboard()
    render(<CopyLinkButton url={URL} label="Copy your response link" />)
    expect(
      screen.getByRole('button', { name: 'Copy your response link' }),
    ).toBeInTheDocument()
  })

  it('renders icon-only with the label as accessible name', async () => {
    const writeText = stubClipboard()
    render(<CopyLinkButton url={URL} iconOnly />)
    const button = screen.getByRole('button', { name: 'Copy link' })
    expect(button).not.toHaveTextContent('Copy link')
    fireEvent.click(button)
    expect(writeText).toHaveBeenCalledWith(URL)
    // accessible name stays stable while the icon flashes
    expect(
      screen.getByRole('button', { name: 'Copy link' }),
    ).toBeInTheDocument()
  })
})
