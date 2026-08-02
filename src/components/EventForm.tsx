import { useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { MultiDatePicker } from '@/components/MultiDatePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { isoDate } from '@/lib/dates'
import { pbErrorMessage } from '@/lib/events'
import { pb } from '@/lib/pocketbase'
import type { EventsRecord } from '@/lib/pocketbase-types'
import { isValidSlug, suggestSlug } from '@/lib/slug'

interface EventFormProps {
  /** When set, the form edits this event instead of creating a new one. */
  initial?: EventsRecord
  submitLabel: string
  onSubmit: (form: FormData) => Promise<void>
  /** Dates that already have responses (warn before removing them). */
  respondedDates?: string[]
  /** Extra validation run before the built-in checks (e.g. guest name). */
  extraValidate?: () => string | null
  /** Rendered as the first form section (e.g. a guest name field). */
  children?: React.ReactNode
}

export function EventForm({
  initial,
  submitLabel,
  onSubmit,
  respondedDates = [],
  extraValidate,
  children,
}: EventFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [dates, setDates] = useState<string[]>(initial?.dates ?? [])
  const [hideNames, setHideNames] = useState(initial?.hideNames ?? false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [preview, setPreview] = useState<string | null>(null)

  function updateImage(file: File | null, remove: boolean) {
    setImageFile(file)
    setRemoveImage(remove)
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old)
      return file ? URL.createObjectURL(file) : null
    })
  }

  const existingImageUrl =
    initial?.image && !removeImage && !imageFile
      ? pb.files.getURL(initial, initial.image)
      : null
  const shownImage = preview ?? existingImageUrl

  const slugPlaceholder = suggestSlug(title) || 'my-event'
  const removedResponded = respondedDates.filter(
    (date) => !dates.includes(date),
  )

  function validate(): string | null {
    const extraProblem = extraValidate?.()
    if (extraProblem) return extraProblem
    if (!title.trim()) return 'Give your event a title.'
    if (dates.length < 2) return 'Pick at least 2 candidate dates.'
    if (slug && !isValidSlug(slug)) {
      return 'Slugs are lowercase letters and numbers separated by hyphens.'
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setBusy(true)
    try {
      const form = new FormData()
      form.set('title', title.trim())
      form.set('slug', slug)
      form.set('description', description)
      form.set('dates', JSON.stringify(dates))
      form.set('hideNames', String(hideNames))
      if (imageFile) form.set('image', imageFile)
      else if (removeImage) form.set('image', '')
      await onSubmit(form)
    } catch (err) {
      setError(pbErrorMessage(err, 'Could not save the event.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {children}

      <div className="space-y-2">
        <Label htmlFor="event-title">Title</Label>
        <Input
          id="event-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summer BBQ"
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="event-slug">
          Custom link{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">/events/</span>
          <Input
            id="event-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={slugPlaceholder}
            maxLength={100}
            className="max-w-60"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="event-description">
          Description{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's the occasion?"
          maxLength={5000}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="event-image">
          Image{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        {shownImage && (
          <div className="relative w-fit">
            <img
              src={shownImage}
              alt="Event"
              className="max-h-48 rounded-lg border object-cover"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Remove image"
              className="absolute top-2 right-2 size-7"
              onClick={() => updateImage(null, true)}
            >
              <X />
            </Button>
          </div>
        )}
        <label
          htmlFor="event-image"
          className="border-input hover:bg-accent inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm"
        >
          <ImagePlus className="size-4" aria-hidden />
          {shownImage ? 'Replace image' : 'Add an image'}
        </label>
        <input
          id="event-image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => updateImage(e.target.files?.[0] ?? null, false)}
        />
      </div>

      <div className="space-y-2">
        <Label>Candidate dates</Label>
        <p className="text-muted-foreground text-sm">
          Pick at least 2 days your group could meet.
        </p>
        <MultiDatePicker
          selected={dates}
          onChange={setDates}
          minDate={initial ? undefined : isoDate(new Date())}
        />
        {removedResponded.length > 0 && (
          <p className="text-destructive text-sm">
            Heads up: removing{' '}
            {removedResponded.length === 1 ? 'a date' : 'dates'} people already
            responded to will drop those answers from the results.
          </p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={hideNames}
          onChange={(e) => setHideNames(e.target.checked)}
          className="accent-primary size-4"
        />
        Hide who&apos;s available — show only counts to the group
      </label>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  )
}
