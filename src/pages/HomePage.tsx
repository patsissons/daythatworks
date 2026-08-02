import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CalendarPlus, Link2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { eventPath } from '@/lib/events'
import { formatDisplayDate } from '@/lib/dates'
import { logger } from '@/lib/logger'
import { pb } from '@/lib/pocketbase'
import type { EventsRecord, SubmissionsRecord } from '@/lib/pocketbase-types'

const HOW_IT_WORKS = [
  {
    icon: CalendarPlus,
    title: 'Propose some days',
    text: 'Create an event and pick every date that could work.',
  },
  {
    icon: Link2,
    title: 'Share one link',
    text: 'Send the permalink — everyone marks the days they can make.',
  },
  {
    icon: Trophy,
    title: 'See the best day',
    text: 'Counts roll up live and the day that works is recommended.',
  },
]

type MineState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready'
      events: EventsRecord[]
      responses: SubmissionsRecord[]
    }

export function HomePage() {
  const { user, isGuest } = useAuth()

  return (
    <div className="space-y-12">
      <section className="mx-auto max-w-2xl space-y-4 pt-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Find a day that works
        </h1>
        <p className="text-muted-foreground text-lg">
          Propose dates, share a link, and see which day fits your whole group —
          no account required, no back-and-forth to decide.
        </p>
        <Button asChild size="lg">
          <Link to="/events/new">
            <CalendarPlus />
            Create an event
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {HOW_IT_WORKS.map(({ icon: Icon, title, text }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="text-primary size-6" aria-hidden />
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{text}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      {user && isGuest && (
        <p className="text-muted-foreground text-center text-sm">
          You&apos;re browsing as a guest — your events and responses live in
          this browser only.{' '}
          <Link to="/login" className="underline underline-offset-4">
            Sign in
          </Link>{' '}
          to keep them.
        </p>
      )}
      {user && <YourStuff userId={user.id} />}
    </div>
  )
}

function YourStuff({ userId }: { userId: string }) {
  const [state, setState] = useState<MineState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      pb.collection('events').getFullList<EventsRecord>({
        filter: pb.filter('creator = {:userId}', { userId }),
        sort: '-created',
      }),
      pb.collection('submissions').getFullList<SubmissionsRecord>({
        filter: pb.filter('submitter = {:userId}', { userId }),
        sort: '-created',
        expand: 'event',
      }),
    ])
      .then(([events, responses]) => {
        if (!cancelled) setState({ status: 'ready', events, responses })
      })
      .catch((error: unknown) => {
        logger.error('failed to load your events', error)
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (state.status === 'loading') {
    return <p className="text-muted-foreground">Loading your events…</p>
  }
  if (state.status === 'error') {
    return (
      <p className="text-muted-foreground">
        Could not load your events right now.
      </p>
    )
  }

  const { events, responses } = state
  const respondedElsewhere = responses.filter(
    (response) => response.expand?.event?.creator !== userId,
  )

  if (events.length === 0 && respondedElsewhere.length === 0) return null

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your events</h2>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You haven&apos;t created any events yet.
          </p>
        ) : (
          events.map((event) => (
            <Link key={event.id} to={eventPath(event)} className="block">
              <Card className="hover:bg-accent/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-base">{event.title}</CardTitle>
                  <CardDescription>
                    {event.dates.length} candidate days ·{' '}
                    {formatDisplayDate(event.dates[0])} –{' '}
                    {formatDisplayDate(event.dates[event.dates.length - 1])}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your responses</h2>
        {respondedElsewhere.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You haven&apos;t responded to anyone else&apos;s event yet.
          </p>
        ) : (
          respondedElsewhere.map((response) => {
            const event = response.expand?.event
            if (!event) return null
            return (
              <Link key={response.id} to={eventPath(event)} className="block">
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-base">{event.title}</CardTitle>
                    <CardDescription>
                      {(response.dates ?? []).length} of {event.dates.length}{' '}
                      days work for you
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )
          })
        )}
      </section>
    </div>
  )
}
