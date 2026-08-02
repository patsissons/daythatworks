import { afterEach, describe, expect, it, vi } from 'vitest'
import { droppedUrl, isHttpUrl, verifyImageUrl } from '@/lib/image'

// jsdom never loads images; simulate load/error from the URL contents.
class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(value: string) {
    if (!value) return
    queueMicrotask(() => {
      if (value.includes('good')) this.onload?.()
      else if (value.includes('bad')) this.onerror?.()
      // 'hang' URLs never settle — exercises the timeout
    })
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('isHttpUrl', () => {
  it('accepts http(s) URLs and rejects everything else', () => {
    expect(isHttpUrl('https://example.com/a.png')).toBe(true)
    expect(isHttpUrl('http://example.com')).toBe(true)
    expect(isHttpUrl('ftp://example.com/a.png')).toBe(false)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('example.com/a.png')).toBe(false)
    expect(isHttpUrl('https://exa mple.com')).toBe(false)
    expect(isHttpUrl('')).toBe(false)
  })
})

describe('verifyImageUrl', () => {
  it('resolves true when the image loads', async () => {
    vi.stubGlobal('Image', FakeImage)
    await expect(verifyImageUrl('https://x/good.png')).resolves.toBe(true)
  })

  it('resolves false when the image errors', async () => {
    vi.stubGlobal('Image', FakeImage)
    await expect(verifyImageUrl('https://x/bad.png')).resolves.toBe(false)
  })

  it('resolves false when the image never settles (timeout)', async () => {
    vi.stubGlobal('Image', FakeImage)
    vi.useFakeTimers()
    const result = verifyImageUrl('https://x/hang.png', 1000)
    await vi.advanceTimersByTimeAsync(1001)
    await expect(result).resolves.toBe(false)
  })
})

describe('droppedUrl', () => {
  function dt(data: Record<string, string>): Pick<DataTransfer, 'getData'> {
    return { getData: (type: string) => data[type] ?? '' }
  }

  it('takes the first non-comment uri-list line', () => {
    expect(
      droppedUrl(
        dt({
          'text/uri-list': '# comment\nhttps://example.com/a.png\nhttps://b',
        }),
      ),
    ).toBe('https://example.com/a.png')
  })

  it('falls back to plain text', () => {
    expect(
      droppedUrl(dt({ 'text/plain': ' https://example.com/b.jpg ' })),
    ).toBe('https://example.com/b.jpg')
  })

  it('rejects non-http drops', () => {
    expect(droppedUrl(dt({ 'text/plain': 'file:///etc/passwd' }))).toBeNull()
    expect(droppedUrl(dt({}))).toBeNull()
  })
})
