// App-wide login dialog: any page can call openLogin() to show the sign-in
// modal over the current route without navigating. Mirrors the lib/auth.tsx
// provider+hook shape.

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { LoginDialog } from '@/components/LoginDialog'

type LoginCallback = (loggedIn: boolean) => void

const LoginDialogContext = createContext<{
  openLogin: (onSettled?: LoginCallback) => void
} | null>(null)

export function LoginDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const callbackRef = useRef<LoginCallback | undefined>(undefined)

  const openLogin = useCallback((onSettled?: LoginCallback) => {
    callbackRef.current = onSettled
    setOpen(true)
  }, [])

  function settle(loggedIn: boolean) {
    const callback = callbackRef.current
    callbackRef.current = undefined
    setOpen(false)
    callback?.(loggedIn)
  }

  return (
    <LoginDialogContext.Provider value={{ openLogin }}>
      {children}
      <LoginDialog open={open} onSettled={settle} />
    </LoginDialogContext.Provider>
  )
}

export function useLoginDialog() {
  const context = useContext(LoginDialogContext)
  if (!context) {
    throw new Error('useLoginDialog must be used within LoginDialogProvider')
  }
  return context
}
