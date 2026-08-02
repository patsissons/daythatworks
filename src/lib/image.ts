export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

/** Mirrors the events.imageUrl pattern in pb_migrations/1700000008_event_image_url.js. */
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value)
}

/**
 * Resolve true when the URL loads as an image in this browser. Uses Image()
 * rather than fetch so cross-origin images verify without CORS headers.
 */
export function verifyImageUrl(
  url: string,
  timeoutMs = 8000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    const timer = setTimeout(() => {
      img.src = ''
      resolve(false)
    }, timeoutMs)
    img.onload = () => {
      clearTimeout(timer)
      resolve(true)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(false)
    }
    img.src = url
  })
}

/** Extract a droppable http(s) URL from a DataTransfer (uri-list first, then plain text). */
export function droppedUrl(
  dataTransfer: Pick<DataTransfer, 'getData'>,
): string | null {
  const uriList = dataTransfer.getData('text/uri-list')
  const fromList = uriList
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#'))
  const candidate = (fromList || dataTransfer.getData('text/plain')).trim()
  return isHttpUrl(candidate) ? candidate : null
}
