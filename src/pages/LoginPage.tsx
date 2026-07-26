import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { usePageTitle } from '@/lib/title'

const devAuthEnabled =
  import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH === 'true'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  usePageTitle('Log in')

  const from = (location.state as { from?: string } | null)?.from ?? '/'

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
        navigate(from, { replace: true })
      } catch {
        setError(`Could not sign in with ${provider}.`)
      }
    })
  }

  async function onDevLogin() {
    await guard(async () => {
      try {
        await auth.loginWithDev()
        navigate(from, { replace: true })
      } catch {
        setError('Dev login failed — is DEV_AUTH=true set on pocketbase?')
      }
    })
  }

  return (
    <div className="mx-auto max-w-sm">
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
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => onOAuth('github')}
          >
            Continue with Github
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
    </div>
  )
}
