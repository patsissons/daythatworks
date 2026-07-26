import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EventForm } from '@/components/EventForm'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import {
  eventPath,
  getEventByIdOrSlug,
  getEventSubmissions,
} from '@/lib/events'
import { logger } from '@/lib/logger'
import { pb } from '@/lib/pocketbase'
import type { EventsRecord, SubmissionsRecord } from '@/lib/pocketbase-types'
import { usePageTitle } from '@/lib/title'

type EditState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      event: EventsRecord
      submissions: SubmissionsRecord[]
    }

export function EditEventPage() {
  const { idOrSlug = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [state, setState] = useState<EditState>({ status: 'loading' })
  usePageTitle('Edit event')

  const load = useCallback(() => {
    return getEventByIdOrSlug(idOrSlug)
      .then(async (event) => {
        const submissions = await getEventSubmissions(event.id)
        setState({ status: 'ready', event, submissions })
      })
      .catch((error: unknown) => {
        logger.error('failed to load event for editing', error)
        setState({ status: 'error', message: 'Could not load this event.' })
      })
  }, [idOrSlug])

  useEffect(() => {
    void load()
  }, [load])

  if (state.status === 'loading') {
    return <p className="text-muted-foreground">Loading event…</p>
  }

  if (state.status === 'error') {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { event, submissions } = state

  if (user?.id !== event.creator) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Organizers only</CardTitle>
          <CardDescription>
            Only the person who created this event can edit it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to={eventPath(event)}>Back to the event</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const respondedDates = event.dates.filter((date) =>
    submissions.some((submission) => (submission.dates ?? []).includes(date)),
  )

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit event</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Changes are visible to everyone with the link.
        </p>
      </div>
      <EventForm
        initial={event}
        respondedDates={respondedDates}
        submitLabel="Save changes"
        onSubmit={async (form) => {
          const updated = await pb
            .collection('events')
            .update<EventsRecord>(event.id, form)
          navigate(eventPath(updated))
        }}
      />
    </div>
  )
}
