import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Download,
  FileSearch,
  FileText,
  Hash,
  Info,
  Layers,
  Link2,
  Tag,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { DocumentDetail, DocumentSummary } from '../api/types'
import { DocumentCard } from '../components/DocumentCard'
import { Link } from '../components/LocalizedLink'
import { FileIcon, fileKindLabel } from '../components/FileIcon'
import { PreviewRenderer } from '../components/PreviewRenderer'
import { useToast } from '../components/Toast'
import { useI18n } from '../i18n/I18nContext'
import { formatBytes, formatDate, formatDateTime, formatNumber } from '../lib/format'
import { categoryStyle } from '../lib/theme'

function DetailSkeleton() {
  return (
    <div className="container-page py-10">
      <div className="skeleton h-3 w-56" />
      <div className="mt-6 flex gap-4">
        <div className="skeleton h-14 w-14 rounded-2xl" />
        <div className="flex-1">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton mt-3 h-8 w-2/3" />
          <div className="skeleton mt-2 h-3 w-40" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_308px]">
        <div className="skeleton h-[620px] rounded-2xl" />
        <div className="skeleton h-[380px] rounded-2xl" />
      </div>
    </div>
  )
}

function MetaRow({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
        <span className="shrink-0 text-[11px] text-ink-400">{label}</span>
        <span className="text-right text-[11px] font-semibold text-ink-700">{value}</span>
      </div>
    </div>
  )
}

export function DocumentDetailPage() {
  const { id } = useParams()
  const { t, locale, setAlternatePath } = useI18n()
  const { toast } = useToast()
  const [document, setDocument] = useState<DocumentDetail | null>(null)
  const [related, setRelated] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    const documentId = Number(id)
    if (!id || Number.isNaN(documentId)) {
      setError(t('detail.invalid'))
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    api
      .getDocument(documentId, locale)
      .then((data) => {
        if (!active) return
        setDocument(data)
        window.document.title = `${data.title} · ${t('brand.name')}`
        const otherPrefix = data.locale === 'en-US' ? 'zh' : 'en'
        setAlternatePath(
          data.alternate_document_id
            ? `/${otherPrefix}/documents/${data.alternate_document_id}`
            : null,
        )
        api.getRelated(documentId, locale).then((items) => {
          if (active) setRelated(items)
        }).catch(() => setRelated([]))
      })
      .catch((err: Error) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      setAlternatePath(null)
    }
  }, [id, locale, t, setAlternatePath])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast(t('detail.linkCopied'))
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast(t('detail.copyFailed'), 'error')
    }
  }

  if (loading) return <DetailSkeleton />

  if (error || !document) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
          <FileSearch className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-xl font-bold text-ink-900">{t('detail.notFound')}</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-ink-500">
          {error || t('detail.notFoundDesc')}
        </p>
        <Link to="/documents" className="btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" />
          {t('detail.back')}
        </Link>
      </div>
    )
  }

  const style = categoryStyle(document.category.color)
  const meta = document.content_meta as {
    page_count?: number
    sheet_count?: number
    paragraph_count?: number
    table_count?: number
    char_count?: number
    image_count?: number
  }
  const imageSuffix = meta.image_count
    ? ` · ${t(meta.image_count === 1 ? 'detail.images.one' : 'detail.images.other', { count: meta.image_count })}`
    : ''
  const structure = meta.page_count
    ? `${t(meta.page_count === 1 ? 'detail.pages.one' : 'detail.pages.other', { count: meta.page_count })}${imageSuffix}`
    : meta.sheet_count
      ? `${t(meta.sheet_count === 1 ? 'detail.sheets.one' : 'detail.sheets.other', { count: meta.sheet_count })}${imageSuffix}`
      : `${t('detail.paragraphs', {
          paragraphs: meta.paragraph_count ?? 0,
          tables: meta.table_count ?? 0,
        })}${imageSuffix}`

  return (
    <>
      <section className="border-b border-ink-200/70 bg-cream bg-hero-glow">
        <div className="container-page py-7 sm:py-9">
          <nav className="flex flex-wrap items-center gap-1.5 text-[10px] text-ink-400" aria-label={t('detail.breadcrumb')}>
            <Link to="/" className="transition hover:text-brand-700">{t('detail.home')}</Link>
            <span>/</span>
            <Link to="/documents" className="transition hover:text-brand-700">{t('detail.library')}</Link>
            <span>/</span>
            <Link
              to={`/documents?category=${document.category.slug}`}
              className="transition hover:text-brand-700"
            >
              {document.category.name}
            </Link>
            <span>/</span>
            <span className="max-w-[200px] truncate font-medium text-ink-600 sm:max-w-xs">{document.title}</span>
          </nav>

          <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="flex min-w-0 items-start gap-4">
              <FileIcon ext={document.file_ext} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${style.badge}`}>
                    {document.category.name}
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-500 ring-1 ring-inset ring-ink-200">
                    {document.doc_type_label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                    <Check className="h-2.5 w-2.5" />
                    {t('detail.published')}
                  </span>
                </div>
                <h1 className="mt-2.5 max-w-3xl text-balance text-2xl font-black leading-tight tracking-tight text-ink-950 sm:text-[32px]">
                  {document.title}
                </h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-400">
                  <span className="font-mono">{document.document_no}</span>
                  <span>{t('detail.version', { revision: document.revision, version: document.version })}</span>
                  <span>{t('detail.updated', { date: formatDate(document.updated_at, locale) })}</span>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button type="button" onClick={copyLink} className="btn-secondary py-2.5">
                {copied ? <Check className="h-4 w-4 text-brand-600" /> : <Copy className="h-4 w-4" />}
                {copied ? t('detail.copied') : t('detail.copy')}
              </button>
              <a href={api.publicDownloadUrl(document.id)} className="btn-primary py-2.5">
                <Download className="h-4 w-4" />
                {t('detail.download')}
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_308px] lg:items-start">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 bg-ink-50/70 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-600">
                <FileText className="h-4 w-4 text-brand-700" />
                {t('detail.preview')}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-ink-400">
                <span>{fileKindLabel(document.file_ext)}</span>
                <span className="h-3 w-px bg-ink-200" />
                <span>{structure}</span>
              </div>
            </div>
            <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
              <div className="mb-6 border-b border-dashed border-ink-200 pb-5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-300">
                  PV IQC STANDARD · ONLINE PREVIEW
                </p>
                <h2 className="mt-2 text-base font-bold text-ink-800">{document.title}</h2>
                <p className="mt-1 font-mono text-[10px] text-ink-400">
                  {document.document_no} / REV {document.revision}
                </p>
              </div>
              <PreviewRenderer blocks={document.content_blocks} />
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-ink-200 bg-white shadow-soft">
              <div className="border-b border-ink-100 px-4 py-3.5">
                <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-ink-500">{t('detail.fileInfo')}</h2>
              </div>
              <div className="px-4 py-2">
                <MetaRow icon={Hash} label={t('detail.docNo')} value={document.document_no} />
                <MetaRow icon={Layers} label={t('detail.versionLabel')} value={`v${document.version} / ${document.revision}`} />
                <MetaRow icon={CalendarDays} label={t('detail.effective')} value={formatDate(document.effective_date, locale, t('common.notSet'))} />
                <MetaRow icon={Clock3} label={t('detail.updatedLabel')} value={formatDateTime(document.updated_at, locale)} />
                <MetaRow icon={Download} label={t('detail.downloads')} value={t(document.download_count === 1 ? 'detail.downloads.one' : 'detail.downloads.other', { count: formatNumber(document.download_count, locale) })} />
                <MetaRow icon={UserRound} label={t('detail.publisher')} value={document.uploaded_by || t('home.visual.publisher')} />
                <MetaRow
                  icon={FileText}
                  label={t('detail.fileSize')}
                  value={`${fileKindLabel(document.file_ext)} · ${formatBytes(document.file_size)}`}
                />
                {document.product_line && (
                  <MetaRow icon={Layers} label={t('detail.productLine')} value={document.product_line} />
                )}
                {document.supplier && (
                  <MetaRow icon={UserRound} label={t('detail.supplier')} value={document.supplier} />
                )}
              </div>
              <div className="border-t border-ink-100 p-4">
                <a href={api.publicDownloadUrl(document.id)} className="btn-primary w-full">
                  <Download className="h-4 w-4" />
                  {t('detail.downloadControlled')}
                </a>
                <p className="mt-2.5 text-center text-[10px] leading-5 text-ink-400">
                  {fileKindLabel(document.file_ext)} · {formatBytes(document.file_size)} · {t('detail.publicDownload')}
                </p>
              </div>
            </div>

            {document.tags.length > 0 && (
              <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-soft">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-500">
                  <Tag className="h-3.5 w-3.5" />
                  {t('detail.tags')}
                </h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {document.tags.map((tag) => (
                    <Link
                      key={tag}
                      to={`/documents?q=${encodeURIComponent(tag)}`}
                      className="rounded-md bg-ink-50 px-2 py-1 text-[10px] font-medium text-ink-500 transition hover:bg-brand-50 hover:text-brand-700"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4">
              <div className="flex gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-[11px] font-bold text-amber-800">{t('detail.usage')}</p>
                  <p className="mt-1 text-[10px] leading-5 text-amber-800/70">
                    {t('detail.previewNote')}
                  </p>
                </div>
              </div>
            </div>

            {document.summary && (
              <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-soft">
                <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-ink-500">{t('detail.summary')}</h2>
                <p className="mt-2.5 text-[11px] leading-6 text-ink-500">{document.summary}</p>
              </div>
            )}
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <div className="flex items-end justify-between">
              <div>
                <p className="eyebrow">{t('detail.relatedEyebrow')}</p>
                <h2 className="mt-1.5 text-xl font-bold text-ink-950">{t('detail.related')}</h2>
              </div>
              <Link
                to={`/documents?category=${document.category.slug}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900"
              >
                {t('detail.more')}
                <Link2 className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {related.map((item) => (
                <DocumentCard key={item.id} document={item} />
              ))}
            </div>
          </section>
        )}

        {!related.length && (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-dashed border-ink-200 py-5 text-[11px] text-ink-400">
            <AlertCircle className="h-3.5 w-3.5" />
            {t('detail.noRelated')}
          </div>
        )}
      </div>
    </>
  )
}
