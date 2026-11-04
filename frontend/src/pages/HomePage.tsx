import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpenCheck,
  Cable,
  Clock3,
  Download,
  FileCheck2,
  FolderTree,
  Frame,
  Layers,
  Layers3,
  Library,
  PlugZap,
  Search,
  Sparkles,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { CategoryStat, PublicStats } from '../api/types'
import { FileIcon } from '../components/FileIcon'
import { Link } from '../components/LocalizedLink'
import { SearchBar } from '../components/SearchBar'
import { formatDate, formatNumber } from '../lib/format'
import { useI18n } from '../i18n/I18nContext'
import { categoryStyle } from '../lib/theme'

const categoryIcons: Record<string, LucideIcon> = {
  'solar-cell': Sun,
  'pv-glass': Layers3,
  'encapsulation-film': Layers,
  'aluminum-frame': Frame,
  'junction-box': PlugZap,
  'ribbon-material': Cable,
}

const quickSearches = ['home.search.1', 'home.search.2', 'home.search.3', 'home.search.4', 'home.search.5']

const steps = [
  { icon: Search, titleKey: 'home.how.1.title', descriptionKey: 'home.how.1.desc' },
  { icon: BookOpenCheck, titleKey: 'home.how.2.title', descriptionKey: 'home.how.2.desc' },
  { icon: Download, titleKey: 'home.how.3.title', descriptionKey: 'home.how.3.desc' },
]

function StatItem({
  icon: Icon,
  value,
  label,
  suffix,
}: {
  icon: LucideIcon
  value: string
  label: string
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-5 sm:px-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xl font-bold tracking-tight text-ink-950">
          {value}
          {suffix && <span className="ml-0.5 text-xs font-semibold text-ink-400">{suffix}</span>}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-ink-400">{label}</p>
      </div>
    </div>
  )
}

function CategoryCard({ category }: { category: CategoryStat }) {
  const { t, locale } = useI18n()
  const style = categoryStyle(category.color)
  const Icon = categoryIcons[category.slug] ?? FolderTree
  return (
    <Link
      to={`/documents?category=${encodeURIComponent(category.slug)}`}
      className={`group relative overflow-hidden rounded-2xl border border-ink-200/80 bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-card ${style.button}`}
    >
      <div className="flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.soft} ${style.text}`}>
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${style.badge}`}>
          {locale === 'en-US'
            ? `${category.count} standard${category.count === 1 ? '' : 's'}`
            : t('home.categories.count', { count: category.count })}
        </span>
      </div>
      <h3 className="mt-4 text-[15px] font-bold text-ink-900 transition group-hover:text-brand-800">
        {category.name}
      </h3>
      <p className="mt-1 text-[11px] text-ink-400">{t('home.categories.open')}</p>
      <ArrowUpRight className="absolute bottom-5 right-5 h-4 w-4 text-ink-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-700" />
    </Link>
  )
}

function HeroVisual({ stats }: { stats: PublicStats | null }) {
  const { t, locale } = useI18n()
  const latest = stats?.recent_documents?.[0]
  return (
    <div className="relative mx-auto w-full max-w-[420px] lg:mx-0">
      <div className="absolute -left-5 top-8 hidden h-[82%] w-[92%] -rotate-6 rounded-2xl border border-brand-200/70 bg-white/70 sm:block" />
      <div className="absolute -right-4 top-3 hidden h-[86%] w-[92%] rotate-3 rounded-2xl border border-amber-200/70 bg-[#fffdf6] sm:block" />

      <div className="relative rounded-2xl border border-ink-200/80 bg-white p-6 shadow-float">
        <div className="flex items-start justify-between border-b border-ink-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-900 text-brand-100">
              <FileCheck2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">{t('home.visual.controlled')}</p>
              <p className="mt-0.5 font-mono text-[10px] text-ink-400">{latest?.document_no ?? t('home.visual.fallbackNo')}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-[9px] font-bold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {t('home.visual.controlledBadge')}
          </span>
        </div>

        <div className="mt-5">
          <span className="text-[10px] font-semibold text-amber-700">{latest?.category_name ?? t('home.visual.fallbackCategory')}</span>
          <h3 className="mt-1.5 line-clamp-2 text-lg font-bold leading-snug text-ink-950">
            {latest?.title ?? t('home.visual.fallbackTitle')}
          </h3>
          <p className="mt-2 text-[11px] leading-5 text-ink-400">{t('home.visual.description')}</p>
        </div>

        <div className="mt-5 space-y-2.5 rounded-xl bg-ink-50/80 p-3.5">
          {[
            [t('home.visual.status'), t('home.visual.statusValue')],
            [t('home.visual.sampling'), 'GB/T 2828.1 · AQL'],
            [t('home.visual.updated'), formatDate(latest?.updated_at, locale)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 text-[10px]">
              <span className="text-ink-400">{label}</span>
              <span className="font-semibold text-ink-700">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-ink-400">
            <BadgeCheck className="h-3.5 w-3.5 text-brand-600" />
            {t('home.visual.publisher')}
          </div>
          <div className="relative flex h-[74px] w-[74px] -rotate-6 items-center justify-center rounded-full border-2 border-brand-700/35 text-brand-800">
            <div className="absolute inset-1 rounded-full border border-dashed border-brand-700/25" />
            <div className="text-center">
              <p className="text-[8px] font-bold tracking-[0.14em]">PV IQC</p>
              <p className="text-base font-black leading-none tracking-tight">PASS</p>
              <p className="mt-0.5 text-[6px] font-semibold tracking-[0.12em]">CONTROLLED</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-3 flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 shadow-card sm:-left-8">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[9px] font-medium text-ink-400">{t('home.visual.recorded')}</p>
          <p className="text-sm font-bold text-ink-900">
            {formatNumber(stats?.document_count ?? 0, locale)} <span className="text-[10px] font-medium text-ink-400">{t('home.unit.docs')}</span>
          </p>
        </div>
      </div>

      <div className="absolute -right-2 top-24 hidden items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-[9px] font-semibold text-brand-700 shadow-sm sm:flex">
        <Clock3 className="h-3 w-3" />
        {t('home.visual.latest', { date: formatDate(stats?.latest_updated_at, locale) })}
      </div>
    </div>
  )
}

export function HomePage() {
  const { t, locale } = useI18n()
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    api
      .getStats(locale)
      .then((data) => {
        if (active) setStats(data)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [locale])

  const categories = useMemo(() => stats?.categories ?? [], [stats])

  return (
    <>
      <section className="relative overflow-hidden bg-cream bg-hero-glow">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
        <div className="container-page relative grid gap-12 py-14 sm:py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-14 lg:py-24">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-brand-800 shadow-sm backdrop-blur">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-700 text-white">
                <BadgeCheck className="h-2.5 w-2.5" />
              </span>
              {t('home.badge')}
            </div>

            <h1 className="mt-5 max-w-2xl text-balance text-[34px] font-black leading-[1.18] tracking-tight text-ink-950 sm:text-[46px] lg:text-[52px]">
              {t('home.title1')}
              {locale === 'en-US' ? ' ' : ''}
              <span className="relative mx-1.5 inline-block text-brand-800">
                {t('home.titleHighlight')}
                <span className="absolute bottom-1 left-0 -z-10 h-2.5 w-full rounded-sm bg-amber-300/60" />
              </span>
              <br className="hidden sm:block" />
              {t('home.title2')}
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-7 text-ink-500">{t('home.subtitle')}</p>

            <div className="mt-7 max-w-xl">
              <SearchBar />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[11px] font-medium text-ink-400">{t('home.hot')}</span>
              {quickSearches.map((keyword) => (
                <Link
                  key={keyword}
                  to={`/documents?q=${encodeURIComponent(t(keyword))}`}
                  className="rounded-full border border-ink-200 bg-white/70 px-2.5 py-1 text-[10px] font-medium text-ink-500 transition hover:border-brand-300 hover:bg-white hover:text-brand-700"
                >
                  {t(keyword)}
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-ink-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {t('home.trust.public')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {t('home.trust.coverage')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {t('home.trust.formats')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                {t('home.trust.version')}
              </span>
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <HeroVisual stats={stats} />
          </div>
        </div>
      </section>

      <div className="container-page relative z-10 -mt-2">
        <div className="grid divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <StatItem icon={Library} value={loading ? '—' : formatNumber(stats?.document_count ?? 0, locale)} suffix={t('home.unit.docs')} label={t('home.stats.documents')} />
          <StatItem icon={FolderTree} value={loading ? '—' : String(stats?.category_count ?? 0)} suffix={t('home.unit.groups')} label={t('home.stats.categories')} />
          <StatItem icon={Download} value={loading ? '—' : formatNumber(stats?.download_count ?? 0, locale)} suffix={t('home.unit.downloads')} label={t('home.stats.downloads')} />
          <StatItem icon={Clock3} value={loading ? '—' : formatDate(stats?.latest_updated_at, locale)} label={t('home.stats.updated')} />
        </div>
      </div>

      <section className="container-page pt-16" id="categories">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">{t('home.categories.eyebrow')}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-950 sm:text-[28px]">{t('home.categories.title')}</h2>
            <p className="mt-1.5 text-sm text-ink-500">{t('home.categories.subtitle')}</p>
          </div>
          <Link
            to="/documents"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:text-brand-900"
          >
            {t('home.categories.all')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[150px] rounded-2xl border border-ink-200 bg-white p-5">
                <div className="skeleton h-11 w-11 rounded-xl" />
                <div className="skeleton mt-4 h-4 w-24" />
                <div className="skeleton mt-2 h-3 w-16" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-10 text-center text-sm text-ink-500">
            {t('home.categories.error')}
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </section>

      <section className="container-page pt-16">
        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">{t('home.recent.eyebrow')}</p>
                <h2 className="mt-1.5 text-xl font-bold text-ink-950">{t('home.recent.title')}</h2>
              </div>
              <Link to="/documents?sort=updated_desc" className="text-xs font-semibold text-brand-700 hover:text-brand-900">
                {t('home.recent.more')}
              </Link>
            </div>

            <div className="mt-4 divide-y divide-ink-100">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex gap-3 py-3.5">
                      <div className="skeleton h-10 w-10" />
                      <div className="flex-1">
                        <div className="skeleton h-3.5 w-3/4" />
                        <div className="skeleton mt-2 h-3 w-1/3" />
                      </div>
                    </div>
                  ))
                : (stats?.recent_documents ?? []).slice(0, 5).map((document) => (
                    <Link
                      key={document.id}
                      to={`/documents/${document.id}`}
                      className="group flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0"
                    >
                      <FileIcon ext={document.file_ext} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink-800 transition group-hover:text-brand-700">
                          {document.title}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 text-[10px] text-ink-400">
                          <span className="font-mono">{document.document_no}</span>
                          <span>{document.category_name}</span>
                          <span>{formatDate(document.updated_at, locale)}</span>
                        </p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-300 transition group-hover:text-brand-600" />
                    </Link>
                  ))}
            </div>
          </div>

          <div className="rounded-2xl bg-brand-950 p-5 text-white shadow-card sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300/60">{t('home.popular.eyebrow')}</p>
                <h2 className="mt-1.5 text-xl font-bold">{t('home.popular.title')}</h2>
              </div>
              <Layers3 className="h-5 w-5 text-brand-300/50" />
            </div>

            <div className="mt-4 space-y-1">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-11 animate-pulse rounded-lg bg-white/10" />
                  ))
                : (stats?.popular_documents ?? []).slice(0, 5).map((document, index) => (
                    <Link
                      key={document.id}
                      to={`/documents/${document.id}`}
                      className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/5"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                          index === 0 ? 'bg-amber-400 text-ink-950' : 'bg-white/10 text-brand-200'
                        }`}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-brand-50/90 group-hover:text-white">
                          {document.title}
                        </p>
                        <p className="mt-0.5 text-[9px] text-brand-200/40">
                          {document.category_name} · {document.document_no}
                        </p>
                      </div>
                    </Link>
                  ))}
              {!loading && !(stats?.popular_documents ?? []).length && (
                <p className="py-8 text-center text-xs text-brand-200/50">{t('home.popular.empty')}</p>
              )}
            </div>

            <Link
              to="/documents?sort=downloads_desc"
              className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-[11px] font-semibold text-brand-100 transition hover:bg-white/5"
            >
              {t('home.popular.more')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page pt-16" id="how-it-works">
        <div className="rounded-2xl border border-ink-200 bg-white px-5 py-8 shadow-soft sm:px-8 sm:py-9">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">{t('home.how.eyebrow')}</p>
              <h2 className="mt-1.5 text-xl font-bold text-ink-950">{t('home.how.title')}</h2>
            </div>
            <p className="max-w-sm text-xs leading-6 text-ink-400">{t('home.how.desc')}</p>
          </div>
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={step.titleKey} className="relative rounded-xl bg-ink-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-[11px] font-bold text-ink-300">0{index + 1}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-ink-800">{t(step.titleKey)}</h3>
                  <p className="mt-1.5 text-[11px] leading-5 text-ink-500">{t(step.descriptionKey)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="container-page pt-16">
        <div className="relative overflow-hidden rounded-2xl bg-brand-900 px-6 py-9 text-white sm:px-10">
          <div className="absolute -right-16 -top-24 h-56 w-56 rounded-full border-[28px] border-white/[0.04]" />
          <div className="absolute -bottom-24 right-32 h-48 w-48 rounded-full border-[20px] border-brand-400/10" />
          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300/60">{t('home.cta.label')}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">{t('home.cta.title')}</h2>
              <p className="mt-2 max-w-xl text-xs leading-6 text-brand-100/55">{t('home.cta.desc')}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2.5">
              <Link to="/documents" className="btn bg-white text-brand-900 hover:bg-brand-50">
                {t('home.cta.browse')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="btn border border-white/20 text-white hover:bg-white/10">
                {t('home.cta.login')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
