import { Check } from 'lucide-react'
import { formatDisplayDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface DateToggleChipsProps {
  /** The event's candidate dates, in display order. */
  dates: string[]
  selected: string[]
  onChange: (dates: string[]) => void
  disabled?: boolean
}

export function DateToggleChips({
  dates,
  selected,
  onChange,
  disabled,
}: DateToggleChipsProps) {
  function toggle(date: string) {
    onChange(
      selected.includes(date)
        ? selected.filter((value) => value !== date)
        : [...selected, date].sort(),
    )
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
            {formatDisplayDate(date)}
          </button>
        )
      })}
    </div>
  )
}
