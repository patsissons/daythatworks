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
  // fixed shell: the footer is in view without scrolling
  await expect(page.locator('footer')).toBeInViewport()
})
