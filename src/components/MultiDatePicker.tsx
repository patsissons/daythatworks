import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isoDate, monthGrid, monthLabel, parseISODate } from '@/lib/dates'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface MultiDatePickerProps {
  selected: string[]
  onChange: (dates: string[]) => void
  /** Days before this ISO date are disabled. */
  minDate?: string
}

export function MultiDatePicker({
  selected,
  onChange,
  minDate,
}: MultiDatePickerProps) {
  const initial = selected.length > 0 ? parseISODate(selected[0]) : new Date()
  const [view, setView] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  })

  const cells = monthGrid(view.year, view.month)
  const today = isoDate(new Date())

  function shiftMonth(delta: number) {
    setView(({ year, month }) => {
      const next = new Date(year, month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  function toggle(date: string) {
    onChange(
      selected.includes(date)
        ? selected.filter((value) => value !== date)
        : [...selected, date].sort(),
    )
  }

  return (
    <div className="w-fit rounded-lg border p-3">
      <div className="flex items-center justify-between pb-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft />
        </Button>
        <span className="text-sm font-medium">
          {monthLabel(view.year, view.month)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday) => (
          <span
            key={weekday}
            className="text-muted-foreground grid h-8 w-8 place-items-center text-xs font-medium"
          >
            {weekday}
          </span>
        ))}
        {cells.map((date, index) =>
          date === null ? (
            <span key={`pad-${index}`} className="h-8 w-8" />
          ) : (
            <button
              key={date}
              type="button"
              aria-pressed={selected.includes(date)}
              aria-label={date}
              disabled={!!minDate && date < minDate}
              onClick={() => toggle(date)}
              className={cn(
                'grid h-8 w-8 place-items-center rounded-md text-sm transition-colors',
                'hover:bg-accent disabled:pointer-events-none disabled:opacity-40',
                selected.includes(date)
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : date === today && 'ring-ring/50 ring-1',
              )}
            >
              {Number(date.slice(8, 10))}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
