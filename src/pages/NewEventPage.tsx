import { useState } from 'react'
import { useNavigate } from 'react-router'
import { EventForm } from '@/components/EventForm'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth'
import { newId } from '@/lib/id'
import { eventPath } from '@/lib/events'
import { useLoginDialog } from '@/lib/login-dialog'
import { pb } from '@/lib/pocketbase'
import type { EventsRecord } from '@/lib/pocketbase-types'
import { usePageTitle } from '@/lib/title'

export function NewEventPage() {
  const navigate = useNavigate()
  const { user, isGuest, loginAsGuest } = useAuth()
  const { openLogin } = useLoginDialog()
  const [name, setName] = useState<string>(
    user && isGuest ? ((user.name as string) ?? '') : '',
  )
  usePageTitle('New event')

  const needsName = !user || isGuest

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
        extraValidate={() => {
          if (needsName && !name.trim()) {
            return "Enter your name so people know who's organizing."
          }
          return null
        }}
        onSubmit={async (form) => {
          if (!user) {
            // first-time guest: mint the persistent guest identity, then create
            await loginAsGuest(name.trim())
          } else if (isGuest && name.trim() && name.trim() !== user.name) {
            await pb.collection('users').update(user.id, { name: name.trim() })
          }
          form.set('id', newId())
          const created = await pb
            .collection('events')
            .create<EventsRecord>(form)
          navigate(eventPath(created))
        }}
      >
        {needsName && (
          <div className="space-y-2">
            <Label htmlFor="organizer-name">Your name</Label>
            <Input
              id="organizer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex"
              maxLength={100}
              className="max-w-60"
              required
            />
            <p className="text-muted-foreground text-sm">
              No account needed — your events are saved in this browser.{' '}
              <button
                type="button"
                className="cursor-pointer underline underline-offset-4"
                onClick={() => openLogin()}
              >
                Sign in instead
              </button>{' '}
              to keep them everywhere.
            </p>
          </div>
        )}
      </EventForm>
    </div>
  )
}
