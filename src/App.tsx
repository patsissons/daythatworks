import { Route, Routes } from 'react-router'
import { Layout } from '@/components/Layout'
import { RequireAuth } from '@/components/RequireAuth'
import { HomePage } from '@/pages/HomePage'
import { AuthProvider } from '@/lib/auth'
import { LoginDialogProvider } from '@/lib/login-dialog'
import { LoginPage } from '@/pages/LoginPage'
import { EditEventPage } from '@/pages/EditEventPage'
import { EventPage } from '@/pages/EventPage'
import { FaqPage } from '@/pages/FaqPage'
import { NewEventPage } from '@/pages/NewEventPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <AuthProvider>
      <LoginDialogProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="events/new" element={<NewEventPage />} />
            <Route path="events/:idOrSlug" element={<EventPage />} />
            <Route
              path="events/:idOrSlug/s/:submissionId"
              element={<EventPage />}
            />
            <Route
              path="events/:idOrSlug/edit"
              element={
                <RequireAuth>
                  <EditEventPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </LoginDialogProvider>
    </AuthProvider>
  )
}
