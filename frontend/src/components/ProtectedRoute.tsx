import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f3]">
        <div className="flex items-center gap-2 text-sm font-medium text-ink-500">
          <Loader2 className="h-5 w-5 animate-spin text-brand-700" />
          正在验证登录状态…
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  return <Outlet />
}
