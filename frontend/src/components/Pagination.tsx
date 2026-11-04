import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'

interface PaginationProps {
  page: number
  pages: number
  onChange: (page: number) => void
  total?: number
}

function pageItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const items: (number | 'ellipsis')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) items.push('ellipsis')
  for (let page = start; page <= end; page += 1) items.push(page)
  if (end < total - 1) items.push('ellipsis')
  items.push(total)
  return items
}

export function Pagination({ page, pages, onChange, total }: PaginationProps) {
  const { t } = useI18n()
  if (pages <= 1) return null

  return (
    <nav className="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label={t('docs.pagination')}>
      {total !== undefined && (
        <p className="text-xs text-ink-400">
          {t('docs.pager', { total, page, pages })}
        </p>
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-500 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label={t('docs.prev')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageItems(page, pages).map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-ink-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={`h-9 min-w-9 rounded-lg px-2 text-xs font-semibold transition ${
                item === page
                  ? 'bg-brand-900 text-white'
                  : 'border border-transparent text-ink-500 hover:border-ink-200 hover:bg-white'
              }`}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-500 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          aria-label={t('docs.next')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  )
}
