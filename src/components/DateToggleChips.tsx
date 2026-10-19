import { Check } from 'lucide-react'
import { formatDisplayDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface DateToggleChipsProps {
  /** The event's candidate options (dates or weekday tokens), in display order. */
  dates: string[]
  selected: string[]
  /** Receives the selection in `dates` order. */
  onChange: (dates: string[]) => void
  disabled?: boolean
  /** Chip label for an option; defaults to "Sat, Jul 25" date formatting. */
  formatLabel?: (value: string) => string
}

export function DateToggleChips({
  dates,
  selected,
  onChange,
  disabled,
  formatLabel = formatDisplayDate,
}: DateToggleChipsProps) {
  function toggle(date: string) {
    const next = new Set(selected)
    if (next.has(date)) next.delete(date)
    else next.add(date)
    onChange(dates.filter((value) => next.has(value)))
  }

  return (
    <div className="flex flex-wrap gap-2">
      {dates.map((date) => {
        const isSelected = selected.includes(date)
        return (
          <button
            key={date}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => toggle(date)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
              'disabled:pointer-events-none disabled:opacity-50',
              isSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'hover:bg-accent',
            )}
          >
            {isSelected && <Check className="size-3.5" aria-hidden />}
            {formatLabel(date)}
          </button>
        )
      })}
    </div>
  )
}
