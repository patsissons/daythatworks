// Pure aggregation of availability submissions into per-date counts and a
// best-day recommendation.

export interface SubmissionSummary {
  id: string
  submitterName: string
  dates: string[]
}

export interface DateAvailability {
  date: string
  count: number
  submissionIds: string[]
}

export interface AvailabilityResult {
  totalSubmissions: number
  /** One entry per event date, in the event's (sorted) date order. */
  perDate: DateAvailability[]
  /** Every date tied at the max count; empty when nobody is available anywhere. */
  bestDates: string[]
  bestCount: number
}

export function aggregateAvailability(
  eventDates: string[],
  submissions: SubmissionSummary[],
): AvailabilityResult {
  const perDate = eventDates.map((date) => {
    const submissionIds = submissions
      .filter((submission) => submission.dates.includes(date))
      .map((submission) => submission.id)
    return { date, count: submissionIds.length, submissionIds }
  })

  const bestCount = Math.max(0, ...perDate.map((entry) => entry.count))
  const bestDates =
    bestCount === 0
      ? []
      : perDate
          .filter((entry) => entry.count === bestCount)
          .map((entry) => entry.date)

  return {
    totalSubmissions: submissions.length,
    perDate,
    bestDates,
    bestCount,
  }
}
