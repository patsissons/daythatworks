import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { QrCodeButton } from '@/components/QrCodeButton'

const URL = 'https://example.com/events/summer-bbq'

beforeAll(() => {
  // jsdom implements neither dialog.showModal() nor dialog.close()
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

function dialog(container: HTMLElement) {
  return container.querySelector('dialog')!
}

describe('QrCodeButton', () => {
  it('opens a modal with the QR code and the url', () => {
    const { container } = render(<QrCodeButton url={URL} title="Summer BBQ" />)
    expect(dialog(container).open).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Show QR code' }))
    expect(dialog(container).open).toBe(true)
    expect(dialog(container).querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('Summer BBQ')).toBeInTheDocument()
    expect(screen.getByText(URL)).toBeInTheDocument()
  })

  it('falls back to a generic dialog title', () => {
    render(<QrCodeButton url={URL} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show QR code' }))
    expect(screen.getByText('Scan to open')).toBeInTheDocument()
  })

  it('closes via the Close button', () => {
    const { container } = render(<QrCodeButton url={URL} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show QR code' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(dialog(container).open).toBe(false)
  })
})
