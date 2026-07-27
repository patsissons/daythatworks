import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { CalendarDays, Pencil } from 'lucide-react'
import { AvailabilityResults } from '@/components/AvailabilityResults'
import { CopyLinkButton } from '@/components/CopyLinkButton'
import { DateToggleChips } from '@/components/DateToggleChips'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { aggregateAvailability } from '@/lib/availability'
import { useAuth } from '@/lib/auth'
import {
  eventPath,
  getEventByIdOrSlug,
  getEventSubmissions,
  pbErrorMessage,
  submissionPath,
} from '@/lib/events'
import { newId } from '@/lib/id'
import { logger } from '@/lib/logger'
import { pb } from '@/lib/pocketbase'
import { usePageTitle } from '@/lib/title'
import type { EventsRecord, SubmissionsRecord } from '@/lib/pocketbase-types'

type EventState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      event: EventsRecord
      submissions: SubmissionsRecord[]
    }

export function EventPage() {
  const { idOrSlug = '', submissionId } = useParams()
  // remount on navigation so each event starts from the loading state
  return (
    <EventContent
      key={idOrSlug}
      idOrSlug={idOrSlug}
      submissionId={submissionId}
    />
  )
}

function EventContent({
  idOrSlug,
  submissionId,
}: {
  idOrSlug: string
  submissionId?: string
}) {
  const { user } = useAuth()
  const [state, setState] = useState<EventState>({ status: 'loading' })
  usePageTitle(state.status === 'ready' ? state.event.title : undefined)

  const load = useCallback(() => {
    return getEventByIdOrSlug(idOrSlug)
      .then(async (event) => {
        const submissions = await getEventSubmissions(event.id)
        setState({ status: 'ready', event, submissions })
      })
      .catch((error: unknown) => {
        const status = (error as { status?: number }).status
        if (status === 404) {
          setState({ status: 'missing' })
        } else {
          logger.error('failed to load event', error)
          setState({
            status: 'error',
            message: 'Could not load this event. Please try again.',
          })
        }
      })
  }, [idOrSlug])

  useEffect(() => {
    void load()
  }, [load])

  if (state.status === 'loading') {
    return <p className="text-muted-foreground">Loading event…</p>
  }

  if (state.status === 'missing') {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Event not found</CardTitle>
          <CardDescription>
            This link doesn&apos;t match any event — it may have been deleted,
            or the address was mistyped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/">Back home</Link>
          </Button>
        </CardContent>
      </Card>
    )
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
  const isCreator = user?.id === event.creator
  const result = aggregateAvailability(
    event.dates,
    submissions.map((submission) => ({
      id: submission.id,
      submitterName: submission.submitterName ?? '',
      dates: submission.dates ?? [],
    })),
  )

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        {event.image && (
          <img
            src={pb.files.getURL(event, event.image)}
            alt=""
            className="max-h-64 w-full rounded-xl border object-cover"
          />
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Organized by {event.creatorName || 'someone'} ·{' '}
              {event.dates.length} candidate days
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CopyLinkButton url={window.location.origin + eventPath(event)} />
            {isCreator && (
              <Button asChild variant="outline" size="sm">
                <Link to={`${eventPath(event)}/edit`}>
                  <Pencil />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        </div>
        {event.description && (
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">
            {event.description}
          </p>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="size-5" aria-hidden />
          Which day works?
        </h2>
        <AvailabilityResults
          result={result}
          submissions={submissions.map((submission) => ({
            id: submission.id,
            submitterName: submission.submitterName ?? '',
            dates: submission.dates ?? [],
          }))}
          focusedSubmissionId={submissionId}
        />
      </section>

      <RespondSection event={event} submissions={submissions} onSaved={load} />
    </div>
  )
}

function RespondSection({
  event,
  submissions,
  onSaved,
}: {
  event: EventsRecord
  submissions: SubmissionsRecord[]
  onSaved: () => Promise<void>
}) {
  const { user, isGuest, loginAsGuest } = useAuth()
  const mine = submissions.find(
    (submission) => submission.submitter === user?.id,
  )
  const [selected, setSelected] = useState<string[]>(mine?.dates ?? [])
  const [name, setName] = useState<string>(
    user && isGuest ? ((user.name as string) ?? '') : '',
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const needsName = !user || isGuest

  async function save() {
    if (needsName && !name.trim()) {
      setError('Enter your name so the group knows who responded.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (!user) {
        // first-time guest: mint the persistent guest identity, then submit
        await loginAsGuest(name.trim())
      } else if (isGuest && name.trim() && name.trim() !== user.name) {
        await pb.collection('users').update(user.id, { name: name.trim() })
      }
      let id = mine?.id
      if (mine) {
        await pb
          .collection('submissions')
          .update(mine.id, { dates: JSON.stringify(selected) })
      } else {
        id = newId()
        await pb.collection('submissions').create({
          id,
          event: event.id,
          dates: JSON.stringify(selected),
        })
      }
      setSavedId(id ?? null)
      await onSaved()
    } catch (err) {
      logger.error('failed to save submission', err)
      setError(pbErrorMessage(err, 'Could not save your availability.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your availability</CardTitle>
        <CardDescription>
          Tap every day that works for you — unselected days count as
          unavailable.
          {!user && ' No account needed — just your name.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsName && (
          <div className="max-w-60 space-y-2">
            <Label htmlFor="responder-name">Your name</Label>
            <Input
              id="responder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex"
              maxLength={100}
              disabled={busy}
            />
          </div>
        )}
        <DateToggleChips
          dates={event.dates}
          selected={selected}
          onChange={setSelected}
          disabled={busy}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={busy}>
            {mine ? 'Update availability' : 'Save availability'}
          </Button>
          {savedId && (
            <CopyLinkButton
              url={window.location.origin + submissionPath(event, savedId)}
              label="Copy your response link"
            />
          )}
        </div>
        {!user && (
          <p className="text-muted-foreground text-sm">
            Have an account?{' '}
            <Link
              to="/login"
              state={{ from: eventPath(event) }}
              className="underline underline-offset-2"
            >
              Sign in instead
            </Link>
          </p>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
      </CardContent>
    </Card>
  )
}
