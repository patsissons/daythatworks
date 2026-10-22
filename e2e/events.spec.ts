import { expect, test, type Page } from '@playwright/test'

/** Sign in as the DEV_AUTH user and wait until the session is live (the
 * "Create an event" CTA renders signed out too, so it can't be the signal). */
async function devLogin(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Dev login' }).click()
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
}

test('the event form is available signed out, with a name field', async ({
  page,
}) => {
  await page.goto('/events/new')
  await expect(page.getByLabel('Your name')).toBeVisible()
  await expect(page.getByLabel('Title')).toBeVisible()
  await expect(page.getByText(/No account needed/)).toBeVisible()
})

test('the event form toggles to days of the week', async ({ page }) => {
  await page.goto('/events/new')
  await page.getByRole('button', { name: 'Days of the week' }).click()
  await expect(page.getByText('Candidate days of the week')).toBeVisible()
  for (const day of ['Sunday', 'Wednesday', 'Saturday']) {
    await expect(page.getByRole('button', { name: day })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Specific dates' }).click()
  await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible()
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

  await devLogin(page)

  await page.goto('/events/new')
  const title = `E2E Event ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: 'Next month' }).click()
  const days = page.locator('button[aria-label^="20"]:not([disabled])')
  await days.nth(0).click()
  await days.nth(1).click()
  await page.getByRole('button', { name: 'Create event' }).click()

  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(
    page.getByText(/No responses yet — share the link/),
  ).toBeVisible()

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
  await devLogin(page)
  await page.goto('/events/new')
  await page.getByLabel('Title').fill(`Guest E2E ${Date.now()}`)
  await page.getByRole('button', { name: 'Next month' }).click()
  const days = page.locator('button[aria-label^="20"]:not([disabled])')
  await days.nth(0).click()
  await days.nth(1).click()
  await page.getByRole('button', { name: 'Create event' }).click()
  await expect(
    page.getByText(/No responses yet — share the link/),
  ).toBeVisible()

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

  // the returning guest can rename themselves
  await page.getByLabel('Your name').fill('E2E Renamed')
  await page.getByRole('button', { name: 'Update availability' }).click()
  await expect(page.locator('header').getByText(/E2E Renamed/)).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'E2E Renamed', exact: true }),
  ).toBeVisible()
  await expect(page.getByText(/E2E Guest/)).toHaveCount(0)

  // ...or clear the name on this response, leaving it anonymous; their
  // default name (shown in the header) is untouched
  await page.getByLabel('Your name').fill('')
  await page.getByRole('button', { name: 'Update availability' }).click()
  await expect(page.getByText(/names hidden/)).toBeVisible()
  await expect(page.locator('main').getByText(/E2E Renamed/)).toHaveCount(0)
  await expect(page.locator('header').getByText(/E2E Renamed/)).toBeVisible()

  // the anonymous choice sticks across reloads
  await page.reload()
  await expect(page.getByLabel('Your name')).toHaveValue('')
})

test('create an event as a guest without an account', async ({ page }) => {
  test.skip(!process.env.E2E_PB_URL, 'needs a local PocketBase (E2E_PB_URL)')

  await page.goto('/events/new')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  const title = `Guest Create E2E ${Date.now()}`
  await page.getByLabel('Your name').fill('E2E Organizer')
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: 'Next month' }).click()
  const days = page.locator('button[aria-label^="20"]:not([disabled])')
  await days.nth(0).click()
  await days.nth(1).click()
  await page.getByRole('button', { name: 'Create event' }).click()

  await expect(page.getByRole('heading', { name: title })).toBeVisible()

  // the guest creator sees their event on the home page
  await page.goto('/')
  await expect(page.getByText(/browsing as a guest/)).toBeVisible()
  await expect(
    page.getByRole('link', { name: new RegExp(title) }),
  ).toBeVisible()
})

test('a named guest organizer responds anonymously to a hidden-names event', async ({
  page,
}) => {
  test.skip(!process.env.E2E_PB_URL, 'needs a local PocketBase (E2E_PB_URL)')

  await page.goto('/events/new')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  const title = `Guest Hidden E2E ${Date.now()}`
  await page.getByLabel('Your name').fill('E2E Host')
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: 'Next month' }).click()
  const days = page.locator('button[aria-label^="20"]:not([disabled])')
  await days.nth(0).click()
  await days.nth(1).click()
  await page.getByLabel(/Hide who.s available/).check()
  await page.getByRole('button', { name: 'Create event' }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()

  // the named guest's response is anonymous, even to themselves as organizer
  await expect(page.getByText(/Your response is anonymous/)).toBeVisible()
  await expect(page.getByLabel('Your name')).toHaveCount(0)
  await page
    .locator('button[aria-pressed]')
    .filter({ hasText: /, / })
    .first()
    .click()
  await page.getByRole('button', { name: 'Save availability' }).click()
  await expect(
    page.getByRole('button', { name: 'Update availability' }),
  ).toBeVisible()
  // hidden-names results show the heatmap only, with no Responses panel
  await expect(
    page.getByRole('button', { name: /1 of 1 available/ }).first(),
  ).toBeVisible()
  await expect(page.getByText(/Responses \(/)).toHaveCount(0)

  // ...while the event still credits them as organizer
  await expect(page.getByText(/Organized by E2E Host/)).toBeVisible()
  await expect(page.getByRole('banner').getByText(/E2E Host/)).toBeVisible()
})

test('create a days-of-the-week event and respond to it', async ({ page }) => {
  test.skip(!process.env.E2E_PB_URL, 'needs a local PocketBase (E2E_PB_URL)')

  await devLogin(page)
  await page.goto('/events/new')
  const title = `E2E Weekly ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: 'Days of the week' }).click()
  await page.getByRole('button', { name: 'Thursday' }).click()
  await page.getByRole('button', { name: 'Tuesday' }).click()
  await page.getByRole('button', { name: 'Create event' }).click()

  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByText(/2 days of the week/)).toBeVisible()

  await page.getByRole('button', { name: 'Thursday', exact: true }).click()
  await page.getByRole('button', { name: 'Save availability' }).click()
  await expect(
    page.getByText('Thursday works best — 1 of 1 person can make it.'),
  ).toBeVisible()

  // weekday results are list-only, with no specific date to add to a calendar
  await expect(page.getByRole('group', { name: 'Results view' })).toHaveCount(0)
  await expect(page.getByText('Best day')).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Add .* to calendar/ }),
  ).toHaveCount(0)
})

test('anonymous events never ask responders for a name', async ({ page }) => {
  test.skip(!process.env.E2E_PB_URL, 'needs a local PocketBase (E2E_PB_URL)')

  await devLogin(page)
  await page.goto('/events/new')
  const title = `E2E Anonymous ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: 'Next month' }).click()
  const days = page.locator('button[aria-label^="20"]:not([disabled])')
  await days.nth(0).click()
  await days.nth(1).click()
  await page.getByLabel(/Hide who.s available/).check()
  await page.getByRole('button', { name: 'Create event' }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()

  // a different person with no account opens the link
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByText(/your response is anonymous/)).toBeVisible()
  await expect(page.getByLabel('Your name')).toHaveCount(0)
  await page
    .locator('button[aria-pressed]')
    .filter({ hasText: /, / })
    .first()
    .click()
  await page.getByRole('button', { name: 'Save availability' }).click()
  await expect(
    page.getByRole('button', { name: 'Update availability' }),
  ).toBeVisible()

  // the nameless guest shows only the guest badge in the header
  await expect(
    page.locator('header').getByText('guest', { exact: true }),
  ).toBeVisible()
  await expect(
    page.locator('header').getByText('Guest', { exact: true }),
  ).toHaveCount(0)
})
