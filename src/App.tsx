import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useSession } from './hooks/useSession'
import { Login } from './routes/Login'
import { Home } from './routes/Home'
import { AccountDetail } from './routes/AccountDetail'
import { AccountSettings } from './routes/AccountSettings'
import { InstallGuide } from './routes/InstallGuide'

export default function App() {
  const { session, loading } = useSession()
  if (loading) return <p>불러오는 중…</p>
  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/account/:id" element={<AccountDetail />} />
        <Route path="/account/:id/settings" element={<AccountSettings />} />
        <Route path="/install" element={<InstallGuide />} />
      </Routes>
    </BrowserRouter>
  )
}
