import { useNavigate } from 'react-router'
import { EventForm } from '@/components/EventForm'
import { newId } from '@/lib/id'
import { eventPath } from '@/lib/events'
import { pb } from '@/lib/pocketbase'
import type { EventsRecord } from '@/lib/pocketbase-types'

export function NewEventPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New event</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Propose some dates, then share the link with your group.
        </p>
      </div>
      <EventForm
        submitLabel="Create event"
        onSubmit={async (form) => {
          form.set('id', newId())
          const created = await pb
            .collection('events')
            .create<EventsRecord>(form)
          navigate(eventPath(created))
        }}
      />
    </div>
  )
}
