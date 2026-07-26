import { Route, Routes } from 'react-router'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/HomePage'
import { AuthProvider } from '@/lib/auth'
import { LoginPage } from '@/pages/LoginPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
