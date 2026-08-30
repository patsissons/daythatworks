import { useEffect, useMemo, useRef, useState } from 'react'
import { QrCode } from 'lucide-react'
import { renderSVG } from 'uqr'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface QrCodeButtonProps {
  url: string
  title?: string
}

/** Icon button that shows the page's QR code in a centered native modal. */
export function QrCodeButton({ url, title }: QrCodeButtonProps) {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const svg = useMemo(() => renderSVG(url), [url])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        aria-label="Show QR code"
        onClick={() => setOpen(true)}
      >
        <QrCode />
      </Button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // clicks on the backdrop (the dialog element itself) dismiss
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="backdrop:bg-background/60 m-auto w-full max-w-xs bg-transparent p-1 backdrop:backdrop-blur-sm"
      >
        {/* only mounted while open so the page's text isn't duplicated */}
        {open && (
          <Card>
            <CardHeader>
              <CardTitle>{title || 'Scan to open'}</CardTitle>
              <CardDescription>
                Point a phone camera at the code to open this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                // always white so the code scans in dark mode too
                className="rounded-lg bg-white p-3 [&_svg]:size-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <p className="text-muted-foreground text-xs break-all">{url}</p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        )}
      </dialog>
    </>
  )
}
