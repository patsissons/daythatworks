import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShareButton } from '@/components/ShareButton'

const URL = 'https://example.com/events/summer-bbq'

describe('ShareButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders nothing when Web Share is unsupported', () => {
    // jsdom's navigator has no share()
    const { container } = render(<ShareButton url={URL} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('opens the share sheet with the title and url', () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, share })
    render(<ShareButton url={URL} title="Summer BBQ" />)
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(share).toHaveBeenCalledWith({ title: 'Summer BBQ', url: URL })
  })

  it('swallows a dismissed share sheet', async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException('cancelled', 'AbortError'))
    vi.stubGlobal('navigator', { ...navigator, share })
    render(<ShareButton url={URL} />)
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    // an unhandled rejection would fail the test run
    await Promise.resolve()
    expect(share).toHaveBeenCalled()
  })
})
