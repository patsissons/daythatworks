import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  droppedUrl,
  IMAGE_MIME_TYPES,
  isHttpUrl,
  verifyImageUrl,
} from '@/lib/image'

export type ImageUrlStatus = 'idle' | 'verifying' | 'ok' | 'error'

interface ImageDropzoneProps {
  /** Current preview URL (object URL, external URL, or existing-file URL). */
  preview: string | null
  /** Committed external URL ('' when the image is a file or absent). */
  url: string
  onFile: (file: File) => void
  /** Called only after the URL verified as a loadable image. */
  onUrl: (url: string) => void
  onRemove: () => void
  /** Reports the URL-verification state so the form can gate submission. */
  onStatusChange?: (status: ImageUrlStatus) => void
  disabled?: boolean
}

export function ImageDropzone({
  preview,
  url,
  onFile,
  onUrl,
  onRemove,
  onStatusChange,
  disabled,
}: ImageDropzoneProps) {
  const [urlDraft, setUrlDraft] = useState(url)
  const [status, setStatusState] = useState<ImageUrlStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const seq = useRef(0)

  function setStatus(next: ImageUrlStatus, nextMessage: string | null = null) {
    setStatusState(next)
    setMessage(nextMessage)
    onStatusChange?.(next)
  }

  async function verify(candidate: string) {
    const value = candidate.trim()
    if (!value) {
      seq.current++
      setStatus('idle')
      return
    }
    if (value === url) return // already committed
    if (!isHttpUrl(value)) {
      seq.current++
      setStatus('error', 'Enter an http(s) link.')
      return
    }
    const mySeq = ++seq.current
    setStatus('verifying')
    const ok = await verifyImageUrl(value)
    if (mySeq !== seq.current) return // a newer check superseded this one
    if (ok) {
      setUrlDraft(value)
      setStatus('ok')
      onUrl(value)
    } else {
      setStatus('error', "That link doesn't load as an image.")
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (IMAGE_MIME_TYPES.includes(file.type)) {
        seq.current++
        setUrlDraft('')
        setStatus('idle')
        onFile(file)
      } else {
        setStatus('error', 'Drop an image file (JPEG, PNG, WebP, or GIF).')
      }
      return
    }
    const droppedLink = droppedUrl(e.dataTransfer)
    if (droppedLink) {
      setUrlDraft(droppedLink)
      void verify(droppedLink)
    } else {
      setStatus('error', 'Drop an image file or an image link.')
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'space-y-2 rounded-lg border border-dashed p-3 transition-colors',
        dragOver && 'bg-accent ring-primary/50 ring-2',
      )}
      data-dragover={dragOver || undefined}
    >
      {preview && (
        <div className="relative w-fit">
          <img
            src={preview}
            alt="Event"
            className="max-h-48 rounded-lg border object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Remove image"
            className="absolute top-2 right-2 size-7"
            onClick={() => {
              seq.current++
              setUrlDraft('')
              setStatus('idle')
              onRemove()
            }}
          >
            <X />
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="event-image"
          className="border-input hover:bg-accent inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm"
        >
          <ImagePlus className="size-4" aria-hidden />
          {preview ? 'Replace image' : 'Add an image'}
        </label>
        <span className="text-muted-foreground text-sm">
          or drop one here, or paste a link:
        </span>
      </div>
      <input
        id="event-image"
        type="file"
        accept={IMAGE_MIME_TYPES.join(',')}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            seq.current++
            setUrlDraft('')
            setStatus('idle')
            onFile(file)
          }
        }}
      />
      <Input
        id="event-image-url"
        type="url"
        aria-label="Image link"
        placeholder="https://example.com/photo.jpg"
        value={urlDraft}
        disabled={disabled}
        onChange={(e) => {
          setUrlDraft(e.target.value)
          if (status !== 'idle') setStatus('idle')
        }}
        onBlur={() => void verify(urlDraft)}
      />
      <p aria-live="polite" className="min-h-4 text-sm">
        {status === 'verifying' && (
          <span className="text-muted-foreground">Checking image…</span>
        )}
        {status === 'ok' && (
          <span className="text-green-600 dark:text-green-500">
            ✓ Image link looks good
          </span>
        )}
        {status === 'error' && (
          <span className="text-destructive">{message}</span>
        )}
      </p>
    </div>
  )
}
