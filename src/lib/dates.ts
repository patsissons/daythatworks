// ISO date ('YYYY-MM-DD') helpers. All parsing pins dates to local noon so
// they never shift across a day boundary in any timezone.

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isoDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false
  const parsed = parseISODate(value)
  return isoDate(parsed) === value
}

/** ISO date `days` after `iso` (negative allowed). */
export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

/** "Sat, Jul 25" */
export function formatDisplayDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** "Sat, Jul 25, 2026" */
export function formatFullDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** "July 2026" */
export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * A Sunday-first month grid for `month` (0-based) of `year`: ISO strings for
 * each day, padded with nulls to full weeks.
 */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < first.getDay(); i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(isoDate(new Date(year, month, day)))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
