import { useState } from 'react'
import { CalendarPlus, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  downloadICS,
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarDayEvent,
} from '@/lib/calendar-links'
import { formatDisplayDate } from '@/lib/dates'
import { eventPath } from '@/lib/events'
import type { EventsRecord } from '@/lib/pocketbase-types'

interface AddToCalendarButtonProps {
  event: Pick<EventsRecord, 'id' | 'title' | 'description' | 'slug'>
  /** ISO YYYY-MM-DD day to add as an all-day calendar event. */
  date: string
}

const itemClass =
  'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm'

export function AddToCalendarButton({ event, date }: AddToCalendarButtonProps) {
  const [open, setOpen] = useState(false)
  const day: CalendarDayEvent = {
    eventId: event.id,
    title: event.title,
    description: event.description || undefined,
    date,
    url: window.location.origin + eventPath(event),
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7"
          aria-label={`Add ${formatDisplayDate(date)} to calendar`}
        >
          <CalendarPlus />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <a
          href={googleCalendarUrl(day)}
          target="_blank"
          rel="noopener noreferrer"
          className={itemClass}
          onClick={() => setOpen(false)}
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          Google Calendar
        </a>
        <button
          type="button"
          className={itemClass}
          onClick={() => {
            downloadICS(day)
            setOpen(false)
          }}
        >
          <Download className="size-4 shrink-0" aria-hidden />
          Apple Calendar / Outlook (.ics)
        </button>
        <a
          href={outlookCalendarUrl(day)}
          target="_blank"
          rel="noopener noreferrer"
          className={itemClass}
          onClick={() => setOpen(false)}
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          Outlook.com
        </a>
        <p className="text-muted-foreground border-t px-2 pt-1.5 pb-1 text-xs">
          Adds one all-day event — we never read your calendar.
        </p>
      </PopoverContent>
    </Popover>
  )
}
