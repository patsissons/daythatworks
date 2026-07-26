import { useEffect, useRef, useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CopyLinkButtonProps {
  url: string
  label?: string
}

export function CopyLinkButton({
  url,
  label = 'Copy link',
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

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="text-primary" /> : <Link2 />}
      {copied ? 'Copied' : label}
    </Button>
  )
}
