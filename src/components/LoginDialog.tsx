import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { GithubIcon, GoogleIcon } from '@/components/BrandIcons'
import { useAuth } from '@/lib/auth'

const devAuthEnabled =
  import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH === 'true'

interface LoginDialogProps {
  open: boolean
  /** Called exactly once per opening: true after a successful login, false
   * when dismissed (Esc / backdrop click). */
  onSettled: (loggedIn: boolean) => void
}

/** Native modal with the sign-in options, shown over the current page. */
export function LoginDialog({ open, onSettled }: LoginDialogProps) {
  const auth = useAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const settledRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      settledRef.current = false
      setError(null)
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  function settle(loggedIn: boolean) {
    if (settledRef.current) return
    settledRef.current = true
    onSettled(loggedIn)
  }

  async function guard(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  async function onOAuth(provider: string) {
    await guard(async () => {
      try {
        await auth.loginWithOAuth(provider)
        settle(true)
      } catch {
        setError(`Could not sign in with ${provider}.`)
      }
    })
  }

  async function onDevLogin() {
    await guard(async () => {
      try {
        await auth.loginWithDev()
        settle(true)
      } catch {
        setError('Dev login failed — is DEV_AUTH=true set on pocketbase?')
      }
    })
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={() => settle(false)}
      onClick={(e) => {
        // clicks on the backdrop (the dialog element itself) dismiss
        if (e.target === dialogRef.current) dialogRef.current?.close()
      }}
      className="backdrop:bg-background/60 m-auto w-full max-w-sm bg-transparent p-1 backdrop:backdrop-blur-sm"
    >
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Welcome back to Day that works</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => onOAuth('google')}
          >
            <GoogleIcon className="size-4" />
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => onOAuth('github')}
          >
            <GithubIcon className="size-4" />
            Continue with GitHub
          </Button>
          {devAuthEnabled && (
            <Button
              variant="secondary"
              className="w-full"
              disabled={busy}
              onClick={onDevLogin}
            >
              Dev login
            </Button>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
      </Card>
    </dialog>
  )
}
