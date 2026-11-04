import { LayoutDashboard, LogIn, Menu, ShieldCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { Link, NavLink } from './LocalizedLink'
import { Logo } from './Logo'

const navItems = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/documents', labelKey: 'nav.library', end: false },
]

function LanguageSwitch() {
  const { locale, switchLocale, t } = useI18n()
  return (
    <div
      className="flex items-center rounded-lg border border-ink-200 bg-white p-0.5 text-[10px] font-semibold"
      role="group"
      aria-label={t('locale.switch')}
    >
      <button
        type="button"
        onClick={() => switchLocale('zh-CN')}
        className={`rounded-md px-2 py-1 transition ${
          locale === 'zh-CN' ? 'bg-brand-900 text-white' : 'text-ink-400 hover:text-brand-700'
        }`}
      >
        中文
      </button>
      <button
        type="button"
        onClick={() => switchLocale('en-US')}
        className={`rounded-md px-2 py-1 transition ${
          locale === 'en-US' ? 'bg-brand-900 text-white' : 'text-ink-400 hover:text-brand-700'
        }`}
      >
        EN
      </button>
    </div>
  )
}

export function Header() {
  const { user } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-[#fbfcfa]/90 backdrop-blur-xl">
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <div className="flex items-center gap-10">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'text-brand-900 after:absolute after:-bottom-[15px] after:left-3.5 after:right-3.5 after:h-[2px] after:rounded-full after:bg-brand-700'
                      : 'text-ink-500 hover:bg-ink-100/70 hover:text-ink-900'
                  }`
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/70 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('header.public')}
          </span>
          <LanguageSwitch />
          {user ? (
            <Link to="/admin" className="btn-primary py-2">
              <LayoutDashboard className="h-4 w-4" />
              {t('header.admin')}
            </Link>
          ) : (
            <Link to="/login" className="btn-secondary py-2">
              <LogIn className="h-4 w-4" />
              {t('header.login')}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitch />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-700"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? t('header.close') : t('header.menu')}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-100 bg-white px-4 py-4 md:hidden animate-fade-in">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2.5 text-sm font-semibold ${
                    isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-600'
                  }`
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
            <Link
              to={user ? '/admin' : '/login'}
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center gap-2 rounded-xl bg-brand-900 px-3 py-2.5 text-sm font-semibold text-white"
            >
              {user ? <LayoutDashboard className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {user ? t('header.admin') : t('header.login')}
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
