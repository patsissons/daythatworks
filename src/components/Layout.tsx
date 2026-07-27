import { Link, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

export function Layout() {
  const { user, isGuest, logout } = useAuth()

  function onLogout() {
    if (
      isGuest &&
      !window.confirm(
        'You are participating as a guest. Logging out discards your guest ' +
          'identity, so you will no longer be able to edit your responses. ' +
          'Log out anyway?',
      )
    ) {
      return
    }
    logout()
  }

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link to="/" className="font-semibold">
            Day that works
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-muted-foreground text-sm">
                  {user.name || user.email}
                  {isGuest && (
                    <span className="bg-secondary text-secondary-foreground ml-1.5 rounded-full border px-2 py-0.5 text-xs">
                      guest
                    </span>
                  )}
                </span>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/login">Log in</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="text-muted-foreground border-t py-4 text-center text-sm">
        Powered by PocketHost
      </footer>
    </div>
  )
}
