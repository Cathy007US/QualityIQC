import { ArrowUpRight, BookOpenCheck, Mail, ShieldCheck } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { Link } from './LocalizedLink'
import { Logo } from './Logo'

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="mt-20 border-t border-ink-200 bg-white">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-7 text-ink-500">{t('footer.desc')}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
              <ShieldCheck className="h-4 w-4" />
              {t('footer.badge')}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-ink-400">
              {t('footer.quick')}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/" className="text-ink-600 transition hover:text-brand-700">
                  {t('footer.home')}
                </Link>
              </li>
              <li>
                <Link to="/documents" className="text-ink-600 transition hover:text-brand-700">
                  {t('footer.all')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-ink-600 transition hover:text-brand-700">
                  {t('footer.login')}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/upload"
                  className="inline-flex items-center gap-1 text-ink-600 transition hover:text-brand-700"
                >
                  {t('footer.upload')} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-ink-400">
              {t('footer.guide')}
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-500">
              <li className="flex gap-2.5">
                <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                {t('footer.support')}
              </li>
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                {t('footer.contact')}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-ink-100 pt-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <p>{t('footer.note')}</p>
        </div>
      </div>
    </footer>
  )
}
