import { ArrowUpRight, Clock3, Download } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { Link } from './LocalizedLink'
import { api } from '../api/client'
import type { DocumentSummary } from '../api/types'
import { formatBytes, formatDate } from '../lib/format'
import { categoryStyle } from '../lib/theme'
import { FileIcon, fileKindLabel } from './FileIcon'

export function DocumentCard({ document }: { document: DocumentSummary }) {
  const style = categoryStyle(document.category.color)
  const { t, locale } = useI18n()

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-200/80 bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card">
      <div className="flex items-start gap-3.5">
        <FileIcon ext={document.file_ext} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${style.badge}`}>
              {document.category.name}
            </span>
            <span className="text-[10px] font-medium text-ink-400">REV {document.revision}</span>
          </div>
          <h3 className="mt-2 text-[15px] font-bold leading-snug text-ink-900 transition group-hover:text-brand-800">
            <Link
              to={`/documents/${document.id}`}
              className="line-clamp-2 after:absolute after:inset-0 focus-visible:outline-none"
            >
              {document.title}
            </Link>
          </h3>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 min-h-[42px] text-[13px] leading-6 text-ink-500">
        {document.summary || t('card.noSummary')}
      </p>

      {document.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {document.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-md bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-500">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-ink-100 pt-4">
        <div className="min-w-0">
          <p className="truncate font-mono text-[11px] font-medium text-ink-400">{document.document_no}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-400">
            <span>{fileKindLabel(document.file_ext)} · {formatBytes(document.file_size)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" />
              {formatDate(document.updated_at, locale)}
            </span>
          </div>
        </div>
        <a
          href={api.publicDownloadUrl(document.id)}
          onClick={(event) => event.stopPropagation()}
          className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-400 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          aria-label={t('card.download', { title: document.title })}
          title={t('card.original')}
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>

      <ArrowUpRight className="absolute right-4 top-4 h-3.5 w-3.5 text-ink-200 opacity-0 transition group-hover:opacity-100" />
    </article>
  )
}
