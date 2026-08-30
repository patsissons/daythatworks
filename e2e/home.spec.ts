import { expect, test } from '@playwright/test'

test('home page renders the app shell', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Find a day that works' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Create an event/ }),
  ).toBeVisible()
  // The shell must render even when the PocketBase backend is unreachable.
  await expect(page.getByText(/Powered by/)).toBeVisible()
  const pockethost = page.getByRole('link', { name: 'PocketHost' })
  await expect(pockethost).toHaveAttribute('href', 'https://pockethost.io/')
  await expect(pockethost).toHaveAttribute('target', '_blank')
  // short pages: min-height flex keeps the footer at the viewport bottom
  await expect(page.locator('footer')).toBeInViewport()
})

test('long pages scroll the document with a sticky header', async ({
  page,
}) => {
  await page.goto('/faq')
  await expect(
    page.getByRole('heading', { name: 'Frequently asked questions' }),
  ).toBeVisible()
  const footer = page.locator('footer')
  await expect(footer).not.toBeInViewport()
  await footer.scrollIntoViewIfNeeded()
  await expect(footer).toBeInViewport()
  // the window itself scrolls (no inner scroll pane)...
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  // ...while the header stays pinned
  await expect(page.getByRole('banner')).toBeInViewport()
})

test('footer links to the FAQ and the open-source repo', async ({ page }) => {
  await page.goto('/')
  const footer = page.locator('footer')
  const github = footer.getByRole('link', { name: 'Open source on GitHub' })
  await expect(github).toHaveAttribute(
    'href',
    'https://github.com/patsissons/daythatworks',
  )
  await expect(github).toHaveAttribute('target', '_blank')
  await footer.getByRole('link', { name: 'FAQ' }).click()
  await expect(
    page.getByRole('heading', { name: 'Frequently asked questions' }),
  ).toBeVisible()
})
