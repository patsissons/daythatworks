import { ClientResponseError } from 'pocketbase'
import { pb } from '@/lib/pocketbase'
import type { EventsRecord, SubmissionsRecord } from '@/lib/pocketbase-types'

/** Resolve an event by its ULID id or its vanity slug. */
export function getEventByIdOrSlug(idOrSlug: string): Promise<EventsRecord> {
  return pb
    .collection('events')
    .getFirstListItem<EventsRecord>(
      pb.filter('id = {:value} || slug = {:value}', { value: idOrSlug }),
    )
}

export function getEventSubmissions(
  eventId: string,
): Promise<SubmissionsRecord[]> {
  return pb.collection('submissions').getFullList<SubmissionsRecord>({
    filter: pb.filter('event = {:eventId}', { eventId }),
    sort: 'created',
  })
}

/** Canonical event path, preferring the slug when one exists. */
export function eventPath(event: Pick<EventsRecord, 'id' | 'slug'>): string {
  return `/events/${event.slug || event.id}`
}

export function submissionPath(
  event: Pick<EventsRecord, 'id' | 'slug'>,
  submissionId: string,
): string {
  return `${eventPath(event)}/s/${submissionId}`
}

/** Best human-readable message from a PocketBase error response. */
export function pbErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ClientResponseError) {
    const fields = error.response.data as
      Record<string, { message?: string }> | undefined
    const fieldError = Object.entries(fields ?? {})[0]
    if (fieldError?.[1]?.message) {
      return `${fieldError[0]}: ${fieldError[1].message}`
    }
    if (error.response.message) return error.response.message as string
  }
  return fallback
}
