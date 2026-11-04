import { ArrowLeft, Compass, Search } from 'lucide-react'
import { Link } from '../components/LocalizedLink'
import { useI18n } from '../i18n/I18nContext'

export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="container-page flex min-h-[65vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-mono text-[76px] font-black leading-none tracking-tighter text-brand-100">404</p>
      <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-200 bg-white text-brand-700 shadow-soft">
        <Compass className="h-5 w-5" />
      </span>
      <h1 className="mt-5 text-xl font-bold text-ink-900">{t('notfound.title')}</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-ink-500">{t('notfound.desc')}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link to="/" className="btn-primary">
          <ArrowLeft className="h-4 w-4" />
          {t('notfound.home')}
        </Link>
        <Link to="/documents" className="btn-secondary">
          <Search className="h-4 w-4" />
          {t('notfound.search')}
        </Link>
      </div>
    </div>
  )
}
