import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { AuthRecord } from 'pocketbase'
import { pb } from '@/lib/pocketbase'

interface AuthContextValue {
  user: AuthRecord | null
  loginWithOAuth: (provider: string) => Promise<void>
  loginWithDev: () => Promise<void>
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

  const logout = useCallback(() => {
    pb.authStore.clear()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loginWithOAuth,
        loginWithDev,
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
