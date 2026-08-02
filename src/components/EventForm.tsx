import { useRef, useState } from 'react'
import { MultiDatePicker } from '@/components/MultiDatePicker'
import { ImageDropzone, type ImageUrlStatus } from '@/components/ImageDropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { isoDate } from '@/lib/dates'
import { isSlugTaken, pbErrorMessage } from '@/lib/events'
import { pb } from '@/lib/pocketbase'
import type { EventsRecord } from '@/lib/pocketbase-types'
import { isReservedSlug, isValidSlug, suggestSlug } from '@/lib/slug'

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

/** What the image should be after saving; upload and link are exclusive. */
type ImageSource =
  | { kind: 'unchanged' }
  | { kind: 'file'; file: File; preview: string }
  | { kind: 'url'; url: string }
  | { kind: 'none' }

type SlugCheck =
  | { status: 'idle' | 'checking' }
  | {
      status: 'available' | 'taken' | 'invalid' | 'reserved' | 'error'
      slug: string
    }

const SLUG_FORMAT_MESSAGE =
  'Slugs are lowercase letters and numbers separated by hyphens.'
const SLUG_TAKEN_MESSAGE = 'That link is taken — pick another.'
const SLUG_RESERVED_MESSAGE = 'That link is reserved — pick another.'

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
  const [image, setImageState] = useState<ImageSource>({ kind: 'unchanged' })
  const [imageUrlStatus, setImageUrlStatus] = useState<ImageUrlStatus>('idle')
  const [slugCheck, setSlugCheck] = useState<SlugCheck>({ status: 'idle' })
  const slugSeq = useRef(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function setImage(next: ImageSource) {
    setImageState((old) => {
      if (old.kind === 'file') URL.revokeObjectURL(old.preview)
      return next
    })
  }

  const preview =
    image.kind === 'file'
      ? image.preview
      : image.kind === 'url'
        ? image.url
        : image.kind === 'unchanged'
          ? initial?.imageUrl ||
            (initial?.image ? pb.files.getURL(initial, initial.image) : null)
          : null
  const committedUrl =
    image.kind === 'url'
      ? image.url
      : image.kind === 'unchanged'
        ? (initial?.imageUrl ?? '')
        : ''

  const slugPlaceholder = suggestSlug(title) || 'my-event'
  const removedResponded = respondedDates.filter(
    (date) => !dates.includes(date),
  )

  async function checkSlug() {
    const value = slug.trim()
    if (!value || value === initial?.slug) {
      slugSeq.current++
      setSlugCheck({ status: 'idle' })
      return
    }
    if (!isValidSlug(value)) {
      slugSeq.current++
      setSlugCheck({ status: 'invalid', slug: value })
      return
    }
    if (isReservedSlug(value)) {
      slugSeq.current++
      setSlugCheck({ status: 'reserved', slug: value })
      return
    }
    const mySeq = ++slugSeq.current
    setSlugCheck({ status: 'checking' })
    try {
      const taken = await isSlugTaken(value, initial?.id)
      if (mySeq !== slugSeq.current) return
      setSlugCheck({ status: taken ? 'taken' : 'available', slug: value })
    } catch {
      if (mySeq !== slugSeq.current) return
      // availability is best-effort; the server's unique index is the backstop
      setSlugCheck({ status: 'error', slug: value })
    }
  }

  function validate(): string | null {
    const extraProblem = extraValidate?.()
    if (extraProblem) return extraProblem
    if (!title.trim()) return 'Give your event a title.'
    if (dates.length < 2) return 'Pick at least 2 candidate dates.'
    if (slug && !isValidSlug(slug)) return SLUG_FORMAT_MESSAGE
    if (slug && isReservedSlug(slug.trim())) return SLUG_RESERVED_MESSAGE
    if (slug && slugCheck.status === 'taken' && slugCheck.slug === slug) {
      return SLUG_TAKEN_MESSAGE
    }
    if (imageUrlStatus === 'verifying') {
      return 'Hang on — still checking the image link.'
    }
    if (imageUrlStatus === 'error') {
      return 'Check the image link before saving.'
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
      if (image.kind === 'file') {
        form.set('image', image.file)
        form.set('imageUrl', '')
      } else if (image.kind === 'url') {
        form.set('imageUrl', image.url)
        form.set('image', '')
      } else if (image.kind === 'none') {
        form.set('image', '')
        form.set('imageUrl', '')
      }
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
            onChange={(e) => {
              setSlug(e.target.value)
              if (slugCheck.status !== 'idle') {
                slugSeq.current++
                setSlugCheck({ status: 'idle' })
              }
            }}
            onBlur={() => void checkSlug()}
            placeholder={slugPlaceholder}
            maxLength={100}
            className="max-w-60"
          />
        </div>
        <p aria-live="polite" className="min-h-4 text-sm">
          {slugCheck.status === 'checking' && (
            <span className="text-muted-foreground">
              Checking availability…
            </span>
          )}
          {slugCheck.status === 'available' && (
            <span className="text-green-600 dark:text-green-500">
              ✓ /events/{slugCheck.slug} is available
            </span>
          )}
          {slugCheck.status === 'taken' && (
            <span className="text-destructive">{SLUG_TAKEN_MESSAGE}</span>
          )}
          {slugCheck.status === 'invalid' && (
            <span className="text-destructive">{SLUG_FORMAT_MESSAGE}</span>
          )}
          {slugCheck.status === 'reserved' && (
            <span className="text-destructive">{SLUG_RESERVED_MESSAGE}</span>
          )}
          {slugCheck.status === 'error' && (
            <span className="text-muted-foreground">
              Couldn&apos;t check availability right now.
            </span>
          )}
        </p>
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
        <ImageDropzone
          preview={preview}
          url={committedUrl}
          onFile={(file) =>
            setImage({ kind: 'file', file, preview: URL.createObjectURL(file) })
          }
          onUrl={(url) => setImage({ kind: 'url', url })}
          onRemove={() => setImage({ kind: 'none' })}
          onStatusChange={setImageUrlStatus}
          disabled={busy}
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
