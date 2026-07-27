import { expect, test } from '@playwright/test'

test('creating an event requires signing in', async ({ page }) => {
  await page.goto('/events/new')
  await expect(
    page.getByRole('button', { name: 'Continue with Google' }),
  ).toBeVisible()
})

test('an unknown event shows a friendly card', async ({ page }) => {
  await page.goto('/events/this-does-not-exist')
  // "Event not found" with a backend, "Something went wrong" without one (CI).
  await expect(
    page.getByText(/Event not found|Something went wrong/),
  ).toBeVisible()
})

// Full flow against a real local PocketBase with dev auth. Run with:
//   DEV_AUTH=true DEV_AUTH_EMAIL=dev@local.test DEV_AUTH_NAME='Dev User' pocketbase serve
//   E2E_PB_URL=http://127.0.0.1:8090 VITE_POCKETBASE_URL=http://127.0.0.1:8090 \
//     VITE_DEV_AUTH=true pnpm test:e2e
test('create an event and respond to it', async ({ page }) => {
  test.skip(!process.env.E2E_PB_URL, 'needs a local PocketBase (E2E_PB_URL)')

  await page.goto('/login')
  await page.getByRole('button', { name: 'Dev login' }).click()
  await expect(
    page.getByRole('link', { name: /Create an event/ }),
  ).toBeVisible()

  await page.goto('/events/new')
  const title = `E2E Event ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: 'Next month' }).click()
  const days = page.locator('button[aria-label^="20"]:not([disabled])')
  await days.nth(0).click()
  await days.nth(1).click()
  await page.getByRole('button', { name: 'Create event' }).click()

  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByText(/No responses yet/)).toBeVisible()

  // respond: first candidate day works for me
  await page
    .locator('button[aria-pressed]')
    .filter({ hasText: /, / })
    .first()
    .click()
  await page.getByRole('button', { name: 'Save availability' }).click()

  await expect(
    page.getByText(/works best — 1 of 1 person can make it/),
  ).toBeVisible()
  await expect(page.getByText('Best day')).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Copy your response link/ }),
  ).toBeVisible()

  // update the response: also select the second day
  await page.getByRole('button', { name: 'Update availability' }).isVisible()
})

test('respond as a guest without an account', async ({ page }) => {
  test.skip(!process.env.E2E_PB_URL, 'needs a local PocketBase (E2E_PB_URL)')

  // organizer creates an event
  await page.goto('/login')
  await page.getByRole('button', { name: 'Dev login' }).click()
  await page.goto('/events/new')
  await page.getByLabel('Title').fill(`Guest E2E ${Date.now()}`)
  await page.getByRole('button', { name: 'Next month' }).click()
  const days = page.locator('button[aria-label^="20"]:not([disabled])')
  await days.nth(0).click()
  await days.nth(1).click()
  await page.getByRole('button', { name: 'Create event' }).click()
  await expect(page.getByText(/No responses yet/)).toBeVisible()

  // a different person with no account opens the link
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByLabel('Your name').fill('E2E Guest')
  await page
    .locator('button[aria-pressed]')
    .filter({ hasText: /, / })
    .first()
    .click()
  await page.getByRole('button', { name: 'Save availability' }).click()
  await expect(
    page.getByRole('button', { name: 'Update availability' }),
  ).toBeVisible()

  // the guest identity persists across reloads and shows in the header
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Update availability' }),
  ).toBeVisible()
  await expect(page.getByText(/E2E Guest/).first()).toBeVisible()
  await expect(page.getByText('guest', { exact: true })).toBeVisible()
})
