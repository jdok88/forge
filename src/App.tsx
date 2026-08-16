import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useSession } from './hooks/useSession'
import { useForegroundAlarm } from './hooks/useForegroundAlarm'
import { Login } from './routes/Login'
import { Home } from './routes/Home'
import { AccountDetail } from './routes/AccountDetail'
import { AccountSettings } from './routes/AccountSettings'
import { InstallGuide } from './routes/InstallGuide'
import { NotificationSettings } from './routes/NotificationSettings'
import { BottomBar } from './components/BottomBar'

export default function App() {
  const { session, loading } = useSession()
  useForegroundAlarm()
  if (loading) return <p>불러오는 중…</p>
  if (!session) return <Login />

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/account/:id" element={<AccountDetail />} />
        <Route path="/account/:id/settings" element={<AccountSettings />} />
        <Route path="/install" element={<InstallGuide />} />
        <Route path="/notifications" element={<NotificationSettings />} />
      </Routes>
      <BottomBar />
    </BrowserRouter>
  )
}
