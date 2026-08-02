import { useMemo, useState } from 'react'
import { initials } from '@/lib/initials'
import type { AvailabilityResult, SubmissionSummary } from '@/lib/availability'
import { formatDisplayDate, monthGrid, monthLabel } from '@/lib/dates'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface AvailabilityHeatmapProps {
  result: AvailabilityResult
  submissions: SubmissionSummary[]
  /** Persistently outline this submission's days (permalinked member). */
  focusedSubmissionId?: string
}

type Hover =
  { kind: 'date'; date: string } | { kind: 'submission'; id: string } | null

/** Sequential ramp: stepped opacities of the primary token (validated for
 * both modes by construction — the tokens flip with the theme). */
function heatClasses(fraction: number): string {
  if (fraction === 0) return 'border'
  if (fraction <= 0.25) return 'bg-primary/20'
  if (fraction <= 0.5) return 'bg-primary/40'
  if (fraction <= 0.75) return 'bg-primary/60 text-primary-foreground'
  if (fraction < 1) return 'bg-primary/80 text-primary-foreground'
  return 'bg-primary text-primary-foreground'
}

const LEGEND_STEPS = [
  'border',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/60',
  'bg-primary/80',
  'bg-primary',
]

export function AvailabilityHeatmap({
  result,
  submissions,
  focusedSubmissionId,
}: AvailabilityHeatmapProps) {
  const [hover, setHover] = useState<Hover>(null)

  const byDate = useMemo(
    () => new Map(result.perDate.map((entry) => [entry.date, entry])),
    [result.perDate],
  )
  const months = useMemo(() => {
    const seen = new Set<string>()
    const list: { year: number; month: number }[] = []
    for (const { date } of result.perDate) {
      const key = date.slice(0, 7)
      if (seen.has(key)) continue
      seen.add(key)
      list.push({
        year: Number(date.slice(0, 4)),
        month: Number(date.slice(5, 7)) - 1,
      })
    }
    return list
  }, [result.perDate])

  const byId = new Map(
    submissions.map((submission) => [submission.id, submission]),
  )
  const anyNames = submissions.some((submission) => submission.submitterName)
  const total = result.totalSubmissions

  /** The submission whose days should be outlined right now. */
  const outlinedSubmission =
    hover?.kind === 'submission'
      ? byId.get(hover.id)
      : hover === null && focusedSubmissionId
        ? byId.get(focusedSubmissionId)
        : undefined

  function namesFor(submissionIds: string[]): string[] {
    return submissionIds
      .map((id) => byId.get(id)?.submitterName ?? '')
      .filter(Boolean)
  }

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-4">
          {months.map(({ year, month }) => (
            <div key={`${year}-${month}`} className="rounded-lg border p-3">
              <p className="pb-2 text-center text-sm font-medium">
                {monthLabel(year, month)}
              </p>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((weekday) => (
                  <span
                    key={weekday}
                    className="text-muted-foreground grid h-8 w-8 place-items-center text-xs font-medium"
                  >
                    {weekday}
                  </span>
                ))}
                {monthGrid(year, month).map((date, index) => {
                  if (date === null) {
                    return <span key={`pad-${index}`} className="h-8 w-8" />
                  }
                  const entry = byDate.get(date)
                  if (!entry) {
                    // not a candidate day — shown faintly for orientation
                    return (
                      <span
                        key={date}
                        aria-hidden
                        className="text-muted-foreground/40 grid h-8 w-8 place-items-center text-sm"
                      >
                        {Number(date.slice(8, 10))}
                      </span>
                    )
                  }
                  const fraction = total === 0 ? 0 : entry.count / total
                  const isBest = result.bestDates.includes(date)
                  const isOutlined =
                    !!outlinedSubmission &&
                    outlinedSubmission.dates.includes(date)
                  const isActive = hover?.kind === 'date' && hover.date === date
                  const names = namesFor(entry.submissionIds)
                  return (
                    <span key={date} className="relative">
                      <button
                        type="button"
                        aria-label={`${formatDisplayDate(date)} — ${entry.count} of ${total} available${isBest ? ' (best day)' : ''}`}
                        onMouseEnter={() => setHover({ kind: 'date', date })}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover({ kind: 'date', date })}
                        onBlur={() => setHover(null)}
                        className={cn(
                          'grid h-8 w-8 cursor-default place-items-center rounded-md text-sm transition-shadow',
                          heatClasses(fraction),
                          isBest && 'ring-2 ring-amber-400',
                          isOutlined &&
                            'outline-foreground outline-2 outline-dashed',
                          isActive && 'ring-ring ring-2',
                        )}
                      >
                        {Number(date.slice(8, 10))}
                      </button>
                      {isActive && (
                        <div
                          role="tooltip"
                          className="bg-popover text-popover-foreground absolute bottom-full left-1/2 z-10 mb-1.5 w-max max-w-52 -translate-x-1/2 rounded-md border px-2.5 py-1.5 text-xs shadow-md"
                        >
                          <p className="font-medium">
                            {formatDisplayDate(date)} · {entry.count}/{total}
                          </p>
                          {names.length > 0 && (
                            <p className="text-muted-foreground">
                              {names.slice(0, 5).join(', ')}
                              {names.length > 5 && ` +${names.length - 5} more`}
                            </p>
                          )}
                        </div>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1">
            Fewer
            {LEGEND_STEPS.map((step) => (
              <span
                key={step}
                aria-hidden
                className={cn('size-3 rounded-sm', step)}
              />
            ))}
            More
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3 rounded-sm ring-2 ring-amber-400"
            />
            Best day
          </span>
        </div>
      </div>

      <div className="shrink-0 space-y-2 sm:w-44">
        <h3 className="text-sm font-medium">Responses ({total})</h3>
        {total === 0 ? (
          <p className="text-muted-foreground text-sm">No responses yet.</p>
        ) : anyNames ? (
          <ul className="space-y-1">
            {submissions.map((submission) => {
              const availableOnHoveredDay =
                hover?.kind === 'date' &&
                byDate.get(hover.date)?.submissionIds.includes(submission.id)
              const dimmed =
                (hover?.kind === 'date' && !availableOnHoveredDay) ||
                (hover?.kind === 'submission' && hover.id !== submission.id)
              return (
                <li key={submission.id}>
                  <button
                    type="button"
                    onMouseEnter={() =>
                      setHover({ kind: 'submission', id: submission.id })
                    }
                    onMouseLeave={() => setHover(null)}
                    onFocus={() =>
                      setHover({ kind: 'submission', id: submission.id })
                    }
                    onBlur={() => setHover(null)}
                    className={cn(
                      'flex w-full cursor-default items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm transition-opacity',
                      dimmed && 'opacity-40',
                      availableOnHoveredDay && 'font-medium',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'bg-secondary text-secondary-foreground grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-medium',
                        submission.id === focusedSubmissionId &&
                          'ring-ring ring-2',
                      )}
                    >
                      {initials(submission.submitterName)}
                    </span>
                    <span className="truncate">
                      {submission.submitterName || 'Anonymous'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            {total} {total === 1 ? 'response' : 'responses'} (names hidden)
          </p>
        )}
      </div>
    </div>
  )
}
