import { Navigate, Route, HashRouter, Routes } from 'react-router-dom'
import { useSession } from './auth'
import Login from './pages/Login'
import AppLayout from './components/AppLayout'
import ChannelManagement from './pages/ChannelManagement'
import UserCenter from './pages/UserCenter'
import OrderCenter from './pages/OrderCenter'
import CoursePackagePage from './pages/CoursePackage'
import CouponPage from './pages/Coupon'
import LandingPageManagement from './pages/LandingPage'

function RequireAuth({ children }: { children: JSX.Element }) {
  const session = useSession()
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const session = useSession()
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/channels" replace />} />
          <Route path="channels" element={<ChannelManagement />} />
          <Route path="landing" element={<LandingPageManagement />} />
          <Route path="users" element={<UserCenter />} />
          <Route path="orders" element={<OrderCenter />} />
          <Route path="packages" element={<CoursePackagePage />} />
          <Route path="coupons" element={<CouponPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
