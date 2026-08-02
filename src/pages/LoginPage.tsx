import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { HomePage } from '@/pages/HomePage'
import { useAuth } from '@/lib/auth'
import { useLoginDialog } from '@/lib/login-dialog'
import { usePageTitle } from '@/lib/title'

/**
 * Deep-link / RequireAuth entry point: normal in-app "Log in" buttons open
 * the dialog over the current page without navigating; this route exists so
 * /login links still work. It shows the home page with the dialog on top,
 * then continues to `state.from` after a successful login.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { openLogin } = useLoginDialog()
  const opened = useRef(false)
  usePageTitle('Log in')

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  useEffect(() => {
    if (opened.current) return
    opened.current = true
    if (user) {
      navigate(from, { replace: true })
      return
    }
    // dismissing goes home (not back to `from` — that could bounce straight
    // back here via RequireAuth); success continues to `from`
    openLogin((loggedIn) => navigate(loggedIn ? from : '/', { replace: true }))
  }, [user, from, navigate, openLogin])

  return <HomePage />
}
