import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageDropzone } from '@/components/ImageDropzone'

// jsdom never loads images; simulate load/error from the URL contents.
class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(value: string) {
    if (!value) return
    queueMicrotask(() => {
      if (value.includes('good')) this.onload?.()
      else this.onerror?.()
    })
  }
}

const onFile = vi.fn()
const onUrl = vi.fn()
const onRemove = vi.fn()
const onStatusChange = vi.fn()

function renderZone(
  props: Partial<React.ComponentProps<typeof ImageDropzone>> = {},
) {
  const { container } = render(
    <ImageDropzone
      preview={null}
      url=""
      onFile={onFile}
      onUrl={onUrl}
      onRemove={onRemove}
      onStatusChange={onStatusChange}
      {...props}
    />,
  )
  return container.firstElementChild as HTMLElement
}

// jsdom has no DataTransfer constructor; React just reads event.dataTransfer.
function dataTransfer(overrides: {
  files?: File[]
  data?: Record<string, string>
}) {
  return {
    files: overrides.files ?? [],
    types: overrides.files?.length ? ['Files'] : ['text/uri-list'],
    getData: (type: string) => overrides.data?.[type] ?? '',
  }
}

describe('ImageDropzone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('Image', FakeImage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('accepts a dropped image file', () => {
    const zone = renderZone()
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    fireEvent.drop(zone, { dataTransfer: dataTransfer({ files: [file] }) })
    expect(onFile).toHaveBeenCalledWith(file)
  })

  it('rejects a dropped non-image file', () => {
    const zone = renderZone()
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' })
    fireEvent.drop(zone, { dataTransfer: dataTransfer({ files: [file] }) })
    expect(onFile).not.toHaveBeenCalled()
    expect(screen.getByText(/Drop an image file/)).toBeInTheDocument()
  })

  it('verifies and commits a dropped URL', async () => {
    const zone = renderZone()
    fireEvent.drop(zone, {
      dataTransfer: dataTransfer({
        data: { 'text/uri-list': 'https://x/good.png' },
      }),
    })
    await waitFor(() =>
      expect(onUrl).toHaveBeenCalledWith('https://x/good.png'),
    )
    expect(screen.getByText(/Image link looks good/)).toBeInTheDocument()
  })

  it('rejects a dropped URL that does not load as an image', async () => {
    const zone = renderZone()
    fireEvent.drop(zone, {
      dataTransfer: dataTransfer({
        data: { 'text/uri-list': 'https://x/broken.png' },
      }),
    })
    expect(
      await screen.findByText(/doesn't load as an image/),
    ).toBeInTheDocument()
    expect(onUrl).not.toHaveBeenCalled()
  })

  it('verifies a typed URL on blur', async () => {
    renderZone()
    const input = screen.getByLabelText('Image link')
    fireEvent.change(input, { target: { value: 'https://x/good.jpg' } })
    fireEvent.blur(input)
    await waitFor(() =>
      expect(onUrl).toHaveBeenCalledWith('https://x/good.jpg'),
    )
  })

  it('flags a non-http link without trying to load it', () => {
    renderZone()
    const input = screen.getByLabelText('Image link')
    fireEvent.change(input, { target: { value: 'not a url' } })
    fireEvent.blur(input)
    expect(screen.getByText('Enter an http(s) link.')).toBeInTheDocument()
    expect(onUrl).not.toHaveBeenCalled()
  })

  it('only commits the latest of two rapid checks', async () => {
    // resolve order is controlled manually: first check settles after the second
    const settlers: Array<() => void> = []
    class DeferredImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(value: string) {
        if (!value) return
        settlers.push(() => this.onload?.())
      }
    }
    vi.stubGlobal('Image', DeferredImage)
    renderZone()
    const input = screen.getByLabelText('Image link')
    fireEvent.change(input, { target: { value: 'https://x/first.png' } })
    fireEvent.blur(input)
    fireEvent.change(input, { target: { value: 'https://x/second.png' } })
    fireEvent.blur(input)
    settlers[0]() // stale check settles late
    settlers[1]()
    await waitFor(() =>
      expect(onUrl).toHaveBeenCalledWith('https://x/second.png'),
    )
    expect(onUrl).not.toHaveBeenCalledWith('https://x/first.png')
  })

  it('clears everything via the remove button', () => {
    renderZone({ preview: 'https://x/existing.png' })
    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
