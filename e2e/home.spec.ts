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
  await expect(page.getByText('Powered by PocketHost')).toBeVisible()
})
