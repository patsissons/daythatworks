import { Trophy } from 'lucide-react'
import { AddToCalendarButton } from '@/components/AddToCalendarButton'
import { AvatarPopoverGroup, InitialsAvatar } from '@/components/InitialsAvatar'
import type { AvailabilityResult, SubmissionSummary } from '@/lib/availability'
import { cn } from '@/lib/utils'
import type { EventKind, EventsRecord } from '@/lib/pocketbase-types'
import { formatOption } from '@/lib/weekdays'

interface AvailabilityResultsProps {
  result: AvailabilityResult
  submissions: SubmissionSummary[]
  /** Highlight the rows this submission is available for (permalinked member). */
  focusedSubmissionId?: string
  /** When provided, each date row offers write-only add-to-calendar links
   * (weekday events don't). */
  event?: Pick<EventsRecord, 'id' | 'title' | 'description' | 'slug'>
  /** Whether rows are dates or weekdays; defaults to dates. */
  kind?: EventKind
}

/** The "X works best" banner, shared by the list and calendar views. */
export function AvailabilityRecommendation({
  result,
  kind = 'dates',
}: {
  result: AvailabilityResult
  kind?: EventKind
}) {
  return (
    <p
      className={cn(
        'rounded-lg border px-4 py-3 text-sm',
        result.bestDates.length > 0
          ? 'border-primary/30 bg-primary/5 font-medium'
          : 'text-muted-foreground',
      )}
    >
      {recommendation(result, kind)}
    </p>
  )
}

function recommendation(result: AvailabilityResult, kind: EventKind): string {
  const { totalSubmissions, bestDates, bestCount } = result
  if (totalSubmissions === 0) {
    return 'No responses yet — share the link with your group to get started.'
  }
  const people = `${bestCount} of ${totalSubmissions} ${totalSubmissions === 1 ? 'person' : 'people'}`
  if (bestDates.length === 0) {
    return 'No day works for anyone yet.'
  }
  if (bestDates.length === 1) {
    return `${formatOption(kind, bestDates[0])} works best — ${people} can make it.`
  }
  return `${bestDates.length} days tie for best — ${people} can make each.`
}

export function AvailabilityResults({
  result,
  submissions,
  focusedSubmissionId,
  event,
  kind = 'dates',
}: AvailabilityResultsProps) {
  const byId = new Map(
    submissions.map((submission) => [submission.id, submission]),
  )
  const anyNames = submissions.some((submission) => submission.submitterName)

  return (
    <AvatarPopoverGroup>
      <div className="space-y-4">
        <ul className="space-y-3">
          {result.perDate.map(({ date, count, submissionIds }) => {
            const isBest = result.bestDates.includes(date)
            const hasFocused =
              !!focusedSubmissionId &&
              submissionIds.includes(focusedSubmissionId)
            const fraction =
              result.totalSubmissions === 0
                ? 0
                : count / result.totalSubmissions
            return (
              <li
                key={date}
                className={cn(
                  'rounded-lg border p-3',
                  isBest && 'border-amber-400/60 bg-amber-400/5',
                  hasFocused && 'ring-ring/40 ring-2',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm font-medium">
                    {formatOption(kind, date)}
                  </span>
                  <div
                    aria-hidden
                    className="bg-muted h-2.5 min-w-0 flex-1 overflow-hidden rounded-full"
                  >
                    <div
                      className="bg-primary h-full rounded-full transition-[width]"
                      style={{ width: `${fraction * 100}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-12 shrink-0 text-right text-sm tabular-nums">
                    {count}/{result.totalSubmissions}
                  </span>
                  {isBest && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-amber-950 shadow-sm ring-1 ring-amber-500/60">
                      <Trophy className="size-3" aria-hidden />
                      Best day
                    </span>
                  )}
                  {event && kind !== 'weekdays' && (
                    <AddToCalendarButton event={event} date={date} />
                  )}
                </div>
                {anyNames && count > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-31">
                    {submissionIds.map((submissionId) => (
                      <InitialsAvatar
                        key={submissionId}
                        name={byId.get(submissionId)?.submitterName ?? ''}
                        avatarUrl={byId.get(submissionId)?.submitterAvatarUrl}
                        className={cn(
                          submissionId === focusedSubmissionId &&
                            'ring-ring ring-2',
                        )}
                      />
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </AvatarPopoverGroup>
  )
}
