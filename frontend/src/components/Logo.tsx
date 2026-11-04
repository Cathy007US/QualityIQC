import { Sun } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { Link } from './LocalizedLink'

interface LogoProps {
  light?: boolean
  compact?: boolean
  to?: string
}

export function Logo({ light = false, compact = false, to = '/' }: LogoProps) {
  const { t } = useI18n()
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5" aria-label={t('brand.home')}>
      <span
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition group-hover:-translate-y-0.5 ${
          light ? 'bg-brand-400 text-brand-950' : 'bg-brand-900 text-brand-100'
        }`}
      >
        <Sun className="h-5 w-5" strokeWidth={2.2} />
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-500" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className={`block text-[17px] font-bold tracking-tight ${light ? 'text-white' : 'text-ink-950'}`}>
            {t('brand.name')}
          </span>
          <span
            className={`mt-1 block text-[9px] font-semibold uppercase tracking-[0.2em] ${
              light ? 'text-brand-200/70' : 'text-ink-400'
            }`}
          >
            Solar Inspection
          </span>
        </span>
      )}
    </Link>
  )
}
