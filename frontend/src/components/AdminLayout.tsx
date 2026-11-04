import {
  ChevronRight,
  ExternalLink,
  Files,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UploadCloud,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Logo } from './Logo'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const navItems: NavItem[] = [
  { to: '/admin', label: '概览', icon: LayoutDashboard, end: true },
  { to: '/admin/documents', label: '文档管理', icon: Files },
  { to: '/admin/upload', label: '上传标准', icon: UploadCloud },
  { to: '/admin/categories', label: '分类管理', icon: FolderTree },
]

const titles: Record<string, { title: string; subtitle: string }> = {
  '/admin': { title: '管理概览', subtitle: '光伏标准运行状态与最近更新' },
  '/admin/documents': { title: '文档管理', subtitle: '检索、维护与下架光伏检验标准' },
  '/admin/upload': { title: '上传标准', subtitle: '上传光伏来料文件并自动解析' },
  '/admin/categories': { title: '分类管理', subtitle: '维护光伏物料目录与展示样式' },
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  const page = titles[location.pathname] ?? { title: '管理中心', subtitle: 'quality-Iqc 管理' }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-950 text-white">
      <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-5">
        <Logo light to="/admin" />
        <button
          type="button"
          className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-label="关闭菜单"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-5 pt-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300/50">Workspace</p>
        <nav className="mt-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-brand-400/15 text-white ring-1 ring-inset ring-brand-400/20'
                      : 'text-brand-100/55 hover:bg-white/5 hover:text-brand-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-brand-300' : 'text-brand-200/50'}`} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-brand-300" />}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>

      <div className="mx-4 mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-brand-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          光伏受控文档
        </div>
        <p className="mt-1.5 text-[10px] leading-5 text-brand-100/40">
          电池片、玻璃、胶膜等标准的上传、替换和下架均写入审计日志。
        </p>
      </div>

      <div className="mt-auto p-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-brand-100/55 transition hover:bg-white/5 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" />
          返回标准库前台
        </Link>
        <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-white/10 p-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-400/15 text-xs font-bold text-brand-200">
            {user?.display_name?.slice(0, 1) || 'A'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{user?.display_name}</p>
            <p className="truncate text-[10px] text-brand-200/40">@{user?.username}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-brand-200/50 transition hover:bg-white/10 hover:text-white"
            title="退出登录"
            aria-label="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f4f5f2]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] lg:block">{sidebar}</aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/45 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-label="关闭菜单"
          />
          <aside className="absolute inset-y-0 left-0 w-[276px] shadow-float animate-fade-in">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-[#fbfcfa]/90 backdrop-blur-xl">
          <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-600 lg:hidden"
                onClick={() => setDrawerOpen(true)}
                aria-label="打开菜单"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                  <span>管理中心</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-brand-700">{page.title}</span>
                </div>
                <h1 className="truncate text-lg font-bold text-ink-900">{page.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/zh/documents"
                className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-500 transition hover:bg-white hover:text-brand-700 sm:flex"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                前台预览
              </Link>
              <span className="hidden h-6 w-px bg-ink-200 sm:block" />
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-900 text-xs font-bold text-brand-100">
                {user?.display_name?.slice(0, 1) || 'A'}
              </span>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1320px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
