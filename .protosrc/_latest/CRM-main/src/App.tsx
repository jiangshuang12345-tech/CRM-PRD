import { Navigate, Route, HashRouter, Routes } from 'react-router-dom'
import { useSession } from './auth'
import { usePerm } from './perm'
import type { ModuleKey } from './types'
import Login from './pages/Login'
import AppLayout from './components/AppLayout'
import ChannelManagement from './pages/ChannelManagement'
import UserCenter from './pages/UserCenter'
import UserCenterP1 from './pages/UserCenterP1'
import UserDetail from './pages/UserDetail'
import SalesCenter from './pages/SalesCenter'
import OrderCenter from './pages/OrderCenter'
import CoursePackagePage from './pages/CoursePackage'
import CouponPage from './pages/Coupon'
import LandingPageManagement from './pages/LandingPage'
import SystemConfig from './pages/SystemConfig'

function RequireAuth({ children }: { children: JSX.Element }) {
  const session = useSession()
  if (!session) return <Navigate to="/login" replace />
  return children
}

const MODULE_PATH: { module: ModuleKey; path: string }[] = [
  { module: 'users', path: '/users' },
  { module: 'usersV2', path: '/users-v2' },
  { module: 'sales', path: '/sales' },
  { module: 'orders', path: '/orders' },
  { module: 'channels', path: '/channels' },
  { module: 'packages', path: '/packages' },
  { module: 'coupons', path: '/coupons' },
  { module: 'landing', path: '/landing' },
  { module: 'system', path: '/system' },
]

function firstAllowedPath(can: (m: ModuleKey) => string): string {
  const hit = MODULE_PATH.find((m) => can(m.module) !== 'none')
  return hit?.path ?? '/channels'
}

// 无权限访问的模块直接重定向到第一个可访问页面
function Guard({ module, children }: { module: ModuleKey; children: JSX.Element }) {
  const { can } = usePerm()
  if (can(module) === 'none') return <Navigate to={firstAllowedPath(can)} replace />
  return children
}

function HomeRedirect() {
  const { can } = usePerm()
  return <Navigate to={firstAllowedPath(can)} replace />
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
          <Route index element={<HomeRedirect />} />
          <Route path="channels" element={<Guard module="channels"><ChannelManagement /></Guard>} />
          <Route path="landing" element={<Guard module="landing"><LandingPageManagement /></Guard>} />
          <Route path="users" element={<Guard module="users"><UserCenterP1 /></Guard>} />
          <Route path="sales" element={<Guard module="sales"><SalesCenter /></Guard>} />
          <Route path="users-v2" element={<Guard module="usersV2"><UserCenter /></Guard>} />
          <Route path="users-v2/:studentId" element={<Guard module="usersV2"><UserDetail /></Guard>} />
          <Route path="orders" element={<Guard module="orders"><OrderCenter /></Guard>} />
          <Route path="packages" element={<Guard module="packages"><CoursePackagePage /></Guard>} />
          <Route path="coupons" element={<Guard module="coupons"><CouponPage /></Guard>} />
          <Route path="system" element={<Guard module="system"><SystemConfig /></Guard>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
