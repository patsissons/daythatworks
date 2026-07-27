import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { ClientResponseError, type AuthRecord } from 'pocketbase'
import { pb } from '@/lib/pocketbase'

interface AuthContextValue {
  user: AuthRecord | null
  /** True when the session belongs to a guest (name-only) identity. */
  isGuest: boolean
  loginWithOAuth: (provider: string) => Promise<void>
  loginWithDev: () => Promise<void>
  loginAsGuest: (name: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthRecord | null>(pb.authStore.record)

  useEffect(() => {
    return pb.authStore.onChange(() => {
      setUser(pb.authStore.record)
    })
  }, [])

  useEffect(() => {
    // extend long-lived sessions (guests especially) on each visit;
    // requestKey null avoids SDK auto-cancellation under StrictMode
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh({ requestKey: null })
        .catch((error: unknown) => {
          // drop the session only on real auth failures, not cancellations
          if (
            error instanceof ClientResponseError &&
            [401, 403, 404].includes(error.status)
          ) {
            pb.authStore.clear()
          }
        })
    }
  }, [])

  const loginWithOAuth = useCallback(async (provider: string) => {
    await pb.collection('users').authWithOAuth2({ provider })
  }, [])

  const loginWithDev = useCallback(async () => {
    const res = await pb.send<{ token: string; record: AuthRecord }>(
      '/api/dev-login',
      { method: 'POST' },
    )
    pb.authStore.save(res.token, res.record)
  }, [])

  const loginAsGuest = useCallback(async (name: string) => {
    const res = await pb.send<{ token: string; record: AuthRecord }>(
      '/api/guest-login',
      { method: 'POST', body: { name } },
    )
    pb.authStore.save(res.token, res.record)
  }, [])

  const logout = useCallback(() => {
    pb.authStore.clear()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest: user?.guest === true,
        loginWithOAuth,
        loginWithDev,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
