import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShareButtonProps {
  url: string
  title?: string
}

/** Opens the OS share sheet. Renders nothing where Web Share is unsupported. */
export function ShareButton({ url, title }: ShareButtonProps) {
  if (typeof navigator.share !== 'function') return null

  function share() {
    // rejects with AbortError when the user dismisses the sheet
    navigator.share({ title, url }).catch(() => {})
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-8"
      aria-label="Share"
      onClick={share}
    >
      <Share2 />
    </Button>
  )
}
