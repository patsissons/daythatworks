import { expect, test } from '@playwright/test'

test('faq page renders questions and the comparison table', async ({
  page,
}) => {
  await page.goto('/faq')
  await expect(
    page.getByRole('heading', { name: 'Frequently asked questions' }),
  ).toBeVisible()
  await expect(page.getByText('Can this app see my calendar?')).toBeVisible()

  const table = page.getByRole('table')
  await expect(table).toBeVisible()
  await expect(table.getByRole('link', { name: 'Timeful' })).toBeVisible()
  await expect(
    table.getByRole('rowheader', { name: 'Day that works' }),
  ).toBeVisible()
  await expect(page.getByText('Never — by design')).toBeVisible()

  // the honest "when to pick a competitor" note
  await expect(page.getByText(/is the strongest option/)).toBeVisible()
})

test('faq page works as a direct deep link (SPA fallback)', async ({
  page,
}) => {
  await page.goto('/faq')
  await expect(page).toHaveTitle('FAQ — Day that works')
})
