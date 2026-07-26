import { Route, Routes } from 'react-router'
import { Layout } from '@/components/Layout'
import { RequireAuth } from '@/components/RequireAuth'
import { HomePage } from '@/pages/HomePage'
import { AuthProvider } from '@/lib/auth'
import { LoginPage } from '@/pages/LoginPage'
import { EventPage } from '@/pages/EventPage'
import { NewEventPage } from '@/pages/NewEventPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route
            path="events/new"
            element={
              <RequireAuth>
                <NewEventPage />
              </RequireAuth>
            }
          />
          <Route path="events/:idOrSlug" element={<EventPage />} />
          <Route
            path="events/:idOrSlug/s/:submissionId"
            element={<EventPage />}
          />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
