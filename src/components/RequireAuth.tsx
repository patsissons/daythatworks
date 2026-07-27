import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/lib/auth'

/**
 * Renders children only when signed in; otherwise bounces to /login and back.
 * With `full`, guest sessions are also bounced (e.g. creating events needs a
 * real account).
 */
export function RequireAuth({
  children,
  full,
}: {
  children: ReactNode
  full?: boolean
}) {
  const { user, isGuest } = useAuth()
  const location = useLocation()

  if (!user || (full && isGuest)) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    )
  }
  return children
}
