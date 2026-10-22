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
  // only first-time guests must give a name; returning guests may clear it
  const requireName = !user

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New event</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Propose some dates (or days of the week), then share the link with
          your group.
        </p>
      </div>
      <EventForm
        submitLabel="Create event"
        extraValidate={() => {
          if (requireName && !name.trim()) {
            return "Enter your name so people know who's organizing."
          }
          return null
        }}
        onSubmit={async (form) => {
          if (!user) {
            // first-time guest: mint the persistent guest identity, then create
            await loginAsGuest(name.trim())
          } else if (isGuest && name.trim() && name.trim() !== user.name) {
            // remember the latest name as the default for future forms
            await pb.collection('users').update(user.id, { name: name.trim() })
          }
          form.set('id', newId())
          // guests name each event they organize (ignored for full accounts)
          if (needsName) form.set('creatorName', name.trim())
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
              required={requireName}
            />
            <p className="text-muted-foreground text-sm">
              {user && 'Leave blank to stay anonymous. '}
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
