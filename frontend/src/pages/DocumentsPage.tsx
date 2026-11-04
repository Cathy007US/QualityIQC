import {
  ChevronDown,
  Filter,
  FolderOpen,
  Library,
  RotateCcw,
  SearchX,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { DOC_TYPE_OPTIONS, type Category, type DocumentSummary, type Page } from '../api/types'
import { DocumentCard } from '../components/DocumentCard'
import { EmptyState } from '../components/EmptyState'
import { Pagination } from '../components/Pagination'
import { SearchBar } from '../components/SearchBar'
import { useI18n } from '../i18n/I18nContext'
import { categoryStyle } from '../lib/theme'

const sortOptions = [
  { value: 'updated_desc', labelKey: 'docs.sort.updated' },
  { value: 'downloads_desc', labelKey: 'docs.sort.downloads' },
  { value: 'title_asc', labelKey: 'docs.sort.title' },
]

export function DocumentsPage() {
  const { t, locale } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const docType = searchParams.get('doc_type') ?? ''
  const sort = searchParams.get('sort') ?? 'updated_desc'
  const page = Math.max(1, Number(searchParams.get('page') || '1'))

  const [categories, setCategories] = useState<Category[]>([])
  const [data, setData] = useState<Page<DocumentSummary> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mobileFilters, setMobileFilters] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    api.getCategories(locale).then(setCategories).catch(() => setCategories([]))
  }, [locale])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api
      .getDocuments({
        q: q || undefined,
        category: category || undefined,
        doc_type: docType || undefined,
        sort,
        page,
        page_size: 12,
        lang: locale,
      })
      .then((response) => {
        if (active) setData(response)
      })
      .catch((err: Error) => {
        if (active) {
          setError(err.message)
          setData(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [q, category, docType, sort, page, reloadKey, locale])

  const activeCategory = useMemo(
    () => categories.find((item) => item.slug === category),
    [categories, category],
  )

  const setParams = (updates: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    if (resetPage) next.delete('page')
    setSearchParams(next)
  }

  const clearFilters = () => setSearchParams(new URLSearchParams())
  const hasFilters = Boolean(q || category || docType || sort !== 'updated_desc')

  const filterContent = (
    <>
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">{t('docs.category')}</h2>
          {category && (
            <button
              type="button"
              onClick={() => setParams({ category: null })}
              className="text-[10px] font-semibold text-brand-700 hover:text-brand-900"
            >
              {t('docs.clear')}
            </button>
          )}
        </div>
        <div className="mt-3 space-y-1">
          <button
            type="button"
            onClick={() => setParams({ category: null })}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${
              !category ? 'bg-brand-900 text-white' : 'text-ink-600 hover:bg-ink-100'
            }`}
          >
            <Library className="h-3.5 w-3.5" />
            <span className="flex-1">{t('docs.all')}</span>
            <span className={!category ? 'text-brand-200' : 'text-ink-400'}>
              {categories.reduce((sum, item) => sum + item.document_count, 0)}
            </span>
          </button>
          {categories.map((item) => {
            const style = categoryStyle(item.color)
            const active = item.slug === category
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setParams({ category: item.slug })}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                  active ? 'bg-brand-50 text-brand-900 ring-1 ring-inset ring-brand-200' : 'text-ink-600 hover:bg-ink-100'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                <span className="flex-1">{item.name}</span>
                <span className={active ? 'font-bold text-brand-700' : 'text-ink-400'}>{item.document_count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6 border-t border-ink-100 pt-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">{t('docs.docType')}</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setParams({ doc_type: null })}
            className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${
              !docType
                ? 'border-brand-900 bg-brand-900 text-white'
                : 'border-ink-200 bg-white text-ink-500 hover:border-brand-300'
            }`}
          >
            {t('docs.typeAll')}
          </button>
          {DOC_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setParams({ doc_type: option.value })}
              className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${
                docType === option.value
                  ? 'border-brand-900 bg-brand-900 text-white'
                  : 'border-ink-200 bg-white text-ink-500 hover:border-brand-300'
              }`}
            >
              {t(`doctype.${option.value}`)}
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <button type="button" onClick={clearFilters} className="btn-secondary mt-6 w-full py-2 text-xs">
          <RotateCcw className="h-3.5 w-3.5" />
          {t('docs.resetAll')}
        </button>
      )}
    </>
  )

  return (
    <>
      <section className="border-b border-ink-200/70 bg-cream bg-hero-glow">
        <div className="container-page py-9 sm:py-11">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">
            <span className="h-px w-6 bg-brand-500" />
            PV STANDARD LIBRARY
          </div>
          <div className="mt-2 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-ink-950 sm:text-[36px]">{t('docs.title')}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink-500">{t('docs.subtitle')}</p>
            </div>
            <div className="w-full max-w-xl lg:w-[430px]">
              <SearchBar initialValue={q} onSubmit={(value) => setParams({ q: value || null })} />
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-ink-500">
            <span className="font-semibold text-ink-800">{loading ? t('docs.loading') : t('docs.count', { count: data?.total ?? 0 })}</span>
            {q && <span className="hidden truncate sm:inline">· {t('docs.keyword', { q })}</span>}
            {activeCategory && <span className="hidden truncate sm:inline">· {activeCategory.name}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary py-2 text-xs lg:hidden"
              onClick={() => setMobileFilters((value) => !value)}
            >
              <Filter className="h-3.5 w-3.5" />
              {t('docs.filter')}
            </button>
            <div className="relative">
              <select
                value={sort}
                onChange={(event) => setParams({ sort: event.target.value })}
                className="h-10 appearance-none rounded-xl border border-ink-200 bg-white pl-3 pr-8 text-xs font-semibold text-ink-600 focus:border-brand-500"
                aria-label={t('docs.sortLabel')}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            </div>
          </div>
        </div>

        {mobileFilters && (
          <div className="mb-5 rounded-2xl border border-ink-200 bg-white p-4 lg:hidden animate-fade-in">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-800">
                <SlidersHorizontal className="h-4 w-4 text-brand-700" />
                {t('docs.filter')}
              </span>
              <button
                type="button"
                onClick={() => setMobileFilters(false)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"
                aria-label={t('docs.closeFilters')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {filterContent}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[236px_1fr] lg:items-start">
          <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-ink-200 bg-white p-4 shadow-soft no-scrollbar lg:block">
            {filterContent}
          </aside>

          <div>
            {(q || category || docType) && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold text-ink-400">{t('docs.current')}</span>
                {q && (
                  <button
                    type="button"
                    onClick={() => setParams({ q: null })}
                    className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-ink-600 hover:border-red-200 hover:text-red-600"
                  >
                    {t('docs.keywordFilter', { q })}
                    <X className="h-3 w-3" />
                  </button>
                )}
                {activeCategory && (
                  <button
                    type="button"
                    onClick={() => setParams({ category: null })}
                    className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-ink-600 hover:border-red-200 hover:text-red-600"
                  >
                    {activeCategory.name}
                    <X className="h-3 w-3" />
                  </button>
                )}
                {docType && (
                  <button
                    type="button"
                    onClick={() => setParams({ doc_type: null })}
                    className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-ink-600 hover:border-red-200 hover:text-red-600"
                  >
                    {DOC_TYPE_OPTIONS.find((item) => item.value === docType) ? t(`doctype.${docType}`) : docType}
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-[250px] rounded-2xl border border-ink-200 bg-white p-5">
                    <div className="flex gap-3">
                      <div className="skeleton h-11 w-11 rounded-xl" />
                      <div className="flex-1">
                        <div className="skeleton h-3 w-24" />
                        <div className="skeleton mt-2 h-4 w-full" />
                        <div className="skeleton mt-1.5 h-4 w-2/3" />
                      </div>
                    </div>
                    <div className="skeleton mt-5 h-3 w-full" />
                    <div className="skeleton mt-2 h-3 w-4/5" />
                    <div className="skeleton mt-6 h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50/50 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-red-700">{t('docs.error')}</p>
                <p className="mt-1 text-xs text-red-600/80">{error}</p>
                <button type="button" className="btn-secondary mt-4" onClick={() => setReloadKey((key) => key + 1)}>
                  {t('docs.retry')}
                </button>
              </div>
            ) : data && data.items.length > 0 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.items.map((document) => (
                    <DocumentCard key={document.id} document={document} />
                  ))}
                </div>
                <div className="mt-7">
                  <Pagination
                    page={data.page}
                    pages={data.pages}
                    total={data.total}
                    onChange={(nextPage) => {
                      setParams({ page: String(nextPage) }, false)
                      window.scrollTo({ top: 300, behavior: 'smooth' })
                    }}
                  />
                </div>
              </>
            ) : (
              <EmptyState
                icon={hasFilters ? SearchX : FolderOpen}
                title={hasFilters ? t('docs.emptyFiltered') : t('docs.empty')}
                description={
                  hasFilters ? t('docs.emptyFilteredDesc') : t('docs.emptyDesc')
                }
                action={
                  hasFilters ? (
                    <button type="button" className="btn-secondary" onClick={clearFilters}>
                      <RotateCcw className="h-4 w-4" />
                      {t('docs.reset')}
                    </button>
                  ) : undefined
                }
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
