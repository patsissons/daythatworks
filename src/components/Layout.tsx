import { Link, Outlet } from 'react-router'
import { GithubIcon } from '@/components/BrandIcons'
import { Button } from '@/components/ui/button'
import { confirmGuestLogout, useAuth } from '@/lib/auth'
import { GITHUB_URL } from '@/lib/faq'
import { useLoginDialog } from '@/lib/login-dialog'

export function Layout() {
  const { user, isGuest, logout } = useAuth()
  const { openLogin } = useLoginDialog()

  function onLogout() {
    if (isGuest && !confirmGuestLogout()) return
    logout()
  }

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col supports-[min-height:100dvh]:min-h-dvh">
      <header className="bg-background sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link to="/" className="font-semibold">
            Day that works
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                  {/* a nameless guest shows just the badge, never the synthetic email */}
                  {user.name || (!isGuest && user.email)}
                  {isGuest && (
                    <span className="bg-secondary text-secondary-foreground rounded-full border px-2 py-0.5 text-xs">
                      guest
                    </span>
                  )}
                </span>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  {isGuest ? 'Forget me' : 'Log out'}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => openLogin()}>
                Log in
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-8">
          <Outlet />
        </div>
      </main>
      <footer className="text-muted-foreground border-t py-4 text-center text-sm">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4">
          <Link
            to="/faq"
            className="hover:text-foreground underline underline-offset-4"
          >
            FAQ
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground inline-flex items-center gap-1.5 underline underline-offset-4"
          >
            <GithubIcon className="size-4" />
            Open source on GitHub
          </a>
          <span>
            Powered by{' '}
            <a
              href="https://pockethost.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline underline-offset-4"
            >
              PocketHost
            </a>
          </span>
        </div>
      </footer>
    </div>
  )
}
