import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientResponseError } from 'pocketbase'
import { isSlugTaken } from '@/lib/events'

const getFirstListItem = vi.fn()
const filter = vi.fn(
  (raw: string, params: Record<string, string>) =>
    `${raw} :: ${JSON.stringify(params)}`,
)

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: () => ({ getFirstListItem }),
    filter: (raw: string, params: Record<string, string>) =>
      filter(raw, params),
  },
}))

describe('isSlugTaken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is taken when a matching event exists', async () => {
    getFirstListItem.mockResolvedValue({ id: 'other' })
    await expect(isSlugTaken('summer-bbq')).resolves.toBe(true)
    expect(filter).toHaveBeenCalledWith('slug = {:slug}', {
      slug: 'summer-bbq',
    })
  })

  it('is available on a 404', async () => {
    getFirstListItem.mockRejectedValue(
      new ClientResponseError({ status: 404, response: {} }),
    )
    await expect(isSlugTaken('summer-bbq')).resolves.toBe(false)
  })

  it('excludes the event being edited', async () => {
    getFirstListItem.mockResolvedValue({ id: 'other' })
    await isSlugTaken('summer-bbq', 'my-event-id')
    expect(filter).toHaveBeenCalledWith('slug = {:slug} && id != {:id}', {
      slug: 'summer-bbq',
      id: 'my-event-id',
    })
  })

  it('rethrows non-404 failures', async () => {
    getFirstListItem.mockRejectedValue(
      new ClientResponseError({ status: 500, response: {} }),
    )
    await expect(isSlugTaken('summer-bbq')).rejects.toBeInstanceOf(
      ClientResponseError,
    )
  })
})
