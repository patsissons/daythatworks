import { useEffect, useRef, useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CopyLinkButtonProps {
  url: string
  label?: string
  /** Render as a compact icon-only button; `label` becomes the aria-label. */
  iconOnly?: boolean
}

export function CopyLinkButton({
  url,
  label = 'Copy link',
  iconOnly = false,
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  const icon = copied ? <Check className="text-primary" /> : <Link2 />

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        aria-label={label}
        onClick={copy}
      >
        {icon}
      </Button>
    )
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {icon}
      {copied ? 'Copied' : label}
    </Button>
  )
}
