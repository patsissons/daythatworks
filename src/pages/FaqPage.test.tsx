import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { FaqPage } from '@/pages/FaqPage'
import { FAQ_ITEMS } from '@/lib/faq'

function renderPage() {
  return render(
    <MemoryRouter>
      <FaqPage />
    </MemoryRouter>,
  )
}

describe('FaqPage', () => {
  it('renders every FAQ question and answer', () => {
    renderPage()
    for (const item of FAQ_ITEMS) {
      expect(screen.getByText(item.question)).toBeInTheDocument()
      expect(screen.getByText(item.answer)).toBeInTheDocument()
    }
  })

  it('sets the page title', () => {
    renderPage()
    expect(document.title).toBe('FAQ — Day that works')
  })

  it('renders the comparison table with all apps', () => {
    renderPage()
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    for (const app of [
      'Day that works',
      'Timeful',
      'When2meet',
      'LettuceMeet',
      'Doodle',
      'Rallly',
      'Crab Fit',
      'CabbageMeet',
    ]) {
      expect(screen.getByRole('rowheader', { name: new RegExp(app) })).toBeInTheDocument()
    }
    expect(screen.getByText('Never — by design')).toBeInTheDocument()
  })

  it('is honest about when Timeful is the better choice', () => {
    renderPage()
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          /Timeful.*is the strongest option/s.test(element.textContent ?? ''),
      ),
    ).toBeInTheDocument()
  })

  it('links to the GitHub repository', () => {
    renderPage()
    const links = screen
      .getAllByRole('link')
      .filter((link) =>
        link
          .getAttribute('href')
          ?.startsWith('https://github.com/patsissons/daythatworks'),
      )
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })
})
