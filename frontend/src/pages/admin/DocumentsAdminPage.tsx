import {
  Download,
  ExternalLink,
  FileClock,
  FileSearch,
  History,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  api,
  replaceDocumentFile,
} from '../../api/client'
import type {
  Category,
  DocumentStatus,
  DocumentSummary,
  DocumentVersion,
  Page,
} from '../../api/types'
import { EmptyState } from '../../components/EmptyState'
import { FileDropzone } from '../../components/FileDropzone'
import { FileIcon } from '../../components/FileIcon'
import { Modal } from '../../components/Modal'
import { Pagination } from '../../components/Pagination'
import { useToast } from '../../components/Toast'
import { formatBytes, formatDate, formatDateTime } from '../../lib/format'
import { categoryStyle } from '../../lib/theme'

export function DocumentsAdminPage() {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const status = (searchParams.get('status') ?? '') as DocumentStatus | ''
  const lang = searchParams.get('lang') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') || '1'))

  const [searchInput, setSearchInput] = useState(q)
  const [categories, setCategories] = useState<Category[]>([])
  const [data, setData] = useState<Page<DocumentSummary> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [deleteTarget, setDeleteTarget] = useState<DocumentSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [replaceTarget, setReplaceTarget] = useState<DocumentSummary | null>(null)
  const [replaceFile, setReplaceFile] = useState<File | null>(null)
  const [replaceRevision, setReplaceRevision] = useState('')
  const [replaceNote, setReplaceNote] = useState('')
  const [replacing, setReplacing] = useState(false)
  const [progress, setProgress] = useState(0)

  const [versionsTarget, setVersionsTarget] = useState<DocumentSummary | null>(null)
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)

  useEffect(() => {
    document.title = '文档管理 · quality-Iqc'
    api.getAdminCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    setSearchInput(q)
  }, [q])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api
      .getAdminDocuments({
        q: q || undefined,
        category: category || undefined,
        status: status || undefined,
        lang: lang || undefined,
        page,
        page_size: 15,
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
  }, [q, category, status, lang, page, reloadKey])

  const setParams = (updates: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    if (resetPage) next.delete('page')
    setSearchParams(next)
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    setParams({ q: searchInput.trim() || null })
  }

  const resetFilters = () => {
    setSearchParams(new URLSearchParams())
  }

  const openReplace = (document: DocumentSummary) => {
    setReplaceTarget(document)
    setReplaceFile(null)
    setReplaceRevision(document.revision)
    setReplaceNote('')
    setProgress(0)
  }

  const handleReplace = async () => {
    if (!replaceTarget || !replaceFile) return
    setReplacing(true)
    setProgress(0)
    try {
      const updated = await replaceDocumentFile(
        replaceTarget.id,
        replaceFile,
        replaceRevision,
        replaceNote,
        setProgress,
      )
      toast(`文件已替换，当前版本 v${updated.version}`)
      setReplaceTarget(null)
      setReloadKey((key) => key + 1)
    } catch (err) {
      toast(err instanceof Error ? err.message : '替换失败', 'error')
    } finally {
      setReplacing(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteDocument(deleteTarget.id)
      toast('文档已下架并删除')
      setDeleteTarget(null)
      if ((data?.items.length ?? 0) === 1 && page > 1) {
        setParams({ page: String(page - 1) }, false)
      } else {
        setReloadKey((key) => key + 1)
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : '删除失败', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const openVersions = async (document: DocumentSummary) => {
    setVersionsTarget(document)
    setVersions([])
    setVersionsLoading(true)
    try {
      setVersions(await api.getVersions(document.id))
    } catch (err) {
      toast(err instanceof Error ? err.message : '版本记录加载失败', 'error')
    } finally {
      setVersionsLoading(false)
    }
  }

  const hasFilters = Boolean(q || category || status || lang)

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-ink-950">全部光伏标准</h2>
          <p className="mt-1 text-xs text-ink-400">
            共 {data?.total ?? 0} 份标准 · 支持替换文件保留历史版本
          </p>
        </div>
        <Link to="/admin/upload" className="btn-primary w-fit">
          <Plus className="h-4 w-4" />
          上传新标准
        </Link>
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white p-3 shadow-soft sm:p-4">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <form onSubmit={submitSearch} className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="搜索标题、编号、检验项目…"
              className="input py-2 pl-9 pr-20 text-xs"
              aria-label="搜索文档"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-ink-900 px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-brand-900"
            >
              搜索
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(event) => setParams({ category: event.target.value || null })}
              className="h-10 min-w-[132px] rounded-xl border border-ink-200 bg-white px-3 text-xs font-medium text-ink-600 focus:border-brand-500"
              aria-label="按分类筛选"
            >
              <option value="">全部分类</option>
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>{item.name}</option>
              ))}
            </select>
            <select
              value={lang}
              onChange={(event) => setParams({ lang: event.target.value || null })}
              className="h-10 min-w-[112px] rounded-xl border border-ink-200 bg-white px-3 text-xs font-medium text-ink-600 focus:border-brand-500"
              aria-label="按语言筛选"
            >
              <option value="">全部语言</option>
              <option value="zh-CN">中文</option>
              <option value="en-US">English</option>
            </select>
            <select
              value={status}
              onChange={(event) => setParams({ status: event.target.value || null })}
              className="h-10 min-w-[112px] rounded-xl border border-ink-200 bg-white px-3 text-xs font-medium text-ink-600 focus:border-brand-500"
              aria-label="按状态筛选"
            >
              <option value="">全部状态</option>
              <option value="published">已发布</option>
              <option value="archived">已归档</option>
            </select>
            {hasFilters && (
              <button type="button" onClick={resetFilters} className="btn-ghost h-10 px-2.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />
                重置
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="table-shell p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 border-b border-ink-100 py-3.5 last:border-0">
              <div className="skeleton h-9 w-9 rounded-lg" />
              <div className="flex-1">
                <div className="skeleton h-3.5 w-1/2" />
                <div className="skeleton mt-2 h-2.5 w-1/4" />
              </div>
              <div className="skeleton h-6 w-16 rounded-full" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50/60 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-red-700">加载失败</p>
          <p className="mt-1 text-xs text-red-600/80">{error}</p>
          <button type="button" className="btn-secondary mt-4" onClick={() => setReloadKey((key) => key + 1)}>
            <RefreshCw className="h-4 w-4" />
            重试
          </button>
        </div>
      ) : data && data.items.length ? (
        <>
          <p className="flex items-center gap-1.5 text-[10px] text-ink-400 sm:hidden">
            <span aria-hidden="true">↔</span>
            左右滑动表格可查看完整信息与操作按钮
          </p>
          <div className="table-shell overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="min-w-[280px]">文档</th>
                  <th>分类</th>
                  <th>版本</th>
                  <th>下载</th>
                  <th>更新时间</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((document) => {
                  const style = categoryStyle(document.category.color)
                  return (
                    <tr key={document.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <FileIcon ext={document.file_ext} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link
                                to={`/${document.locale === 'en-US' ? 'en' : 'zh'}/documents/${document.id}`}
                                className="max-w-[320px] truncate text-[12px] font-semibold text-ink-800 transition hover:text-brand-700"
                              >
                                {document.title}
                              </Link>
                              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                document.locale === 'en-US'
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'bg-brand-50 text-brand-700'
                              }`}>
                                {document.locale === 'en-US' ? 'EN' : '中文'}
                              </span>
                              {document.status === 'archived' && (
                                <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[9px] font-semibold text-ink-500">
                                  已归档
                                </span>
                              )}
                            </div>
                            <p className="mt-1 font-mono text-[9px] text-ink-400">
                              {document.document_no} · {document.file_ext.replace('.', '').toUpperCase()} ·{' '}
                              {formatBytes(document.file_size)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`inline-block rounded-md px-2 py-0.5 text-[9px] font-bold ring-1 ring-inset ${style.badge}`}>
                          {document.category.name}
                        </span>
                      </td>
                      <td>
                        <div className="text-[11px] font-semibold text-ink-700">v{document.version}</div>
                        <div className="text-[9px] text-ink-400">{document.revision}</div>
                      </td>
                      <td className="font-mono text-[11px] text-ink-500">{document.download_count}</td>
                      <td className="text-[10px] text-ink-400">{formatDate(document.updated_at)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-0.5">
                          <a
                            href={`/${document.locale === 'en-US' ? 'en' : 'zh'}/documents/${document.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg p-2 text-ink-400 transition hover:bg-brand-50 hover:text-brand-700"
                            title="前台查看"
                            aria-label="前台查看"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => openReplace(document)}
                            className="rounded-lg p-2 text-ink-400 transition hover:bg-blue-50 hover:text-blue-600"
                            title="替换文件"
                            aria-label="替换文件"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openVersions(document)}
                            className="rounded-lg p-2 text-ink-400 transition hover:bg-violet-50 hover:text-violet-600"
                            title="版本历史"
                            aria-label="版本历史"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(document)}
                            className="rounded-lg p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                            title="下架删除"
                            aria-label="下架删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="rounded-xl border border-ink-200 bg-white px-4 py-3">
              <Pagination
                page={data.page}
                pages={data.pages}
                total={data.total}
                onChange={(next) => setParams({ page: String(next) }, false)}
              />
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={hasFilters ? FileSearch : FileClock}
          title={hasFilters ? '没有匹配的标准' : '还没有标准'}
          description={hasFilters ? '调整搜索条件或重置筛选后再试。' : '上传第一份光伏 IQC 检验标准，开始构建知识库。'}
          action={
            hasFilters ? (
              <button type="button" className="btn-secondary" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" />
                重置筛选
              </button>
            ) : (
              <Link to="/admin/upload" className="btn-primary">
                <Plus className="h-4 w-4" />
                上传新标准
              </Link>
            )
          }
        />
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="下架并删除文档"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              取消
            </button>
            <button type="button" className="btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleting ? '删除中…' : '确认下架'}
            </button>
          </>
        }
      >
        <div className="rounded-xl border border-red-100 bg-red-50/70 p-4">
          <p className="text-sm font-semibold text-red-800">{deleteTarget?.title}</p>
          <p className="mt-1.5 text-xs leading-6 text-red-700/80">
            下架后该文档将从公开文库中移除，且无法在前台访问。原始文件和历史版本会保留在服务器上。
          </p>
        </div>
      </Modal>

      <Modal
        open={Boolean(replaceTarget)}
        onClose={() => !replacing && setReplaceTarget(null)}
        title="替换标准文件"
        description={replaceTarget ? `为「${replaceTarget.title}」上传新版本文件，当前 v${replaceTarget.version}` : undefined}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setReplaceTarget(null)} disabled={replacing}>
              取消
            </button>
            <button type="button" className="btn-primary" onClick={handleReplace} disabled={!replaceFile || replacing}>
              {replacing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {replacing ? `上传中 ${progress}%` : '替换并生成新版本'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FileDropzone
            file={replaceFile}
            onFile={setReplaceFile}
            onReject={(message) => toast(message, 'error')}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">新版本号 / 修订号</label>
              <input
                value={replaceRevision}
                onChange={(event) => setReplaceRevision(event.target.value)}
                placeholder="如 B0"
                className="input"
              />
            </div>
            <div>
              <label className="label">变更说明（可选）</label>
              <input
                value={replaceNote}
                onChange={(event) => setReplaceNote(event.target.value)}
                placeholder="如：更新外观判定标准"
                className="input"
              />
            </div>
          </div>
          {replacing && (
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1.5 text-[10px] text-ink-400">正在上传并解析文件，请勿关闭页面…</p>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(versionsTarget)}
        onClose={() => setVersionsTarget(null)}
        title="版本历史"
        description={versionsTarget ? `${versionsTarget.document_no} · ${versionsTarget.title}` : undefined}
        size="lg"
      >
        {versionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : versions.length ? (
          <div className="space-y-2">
            {versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50/40 p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-brand-800 shadow-sm">
                  v{version.version}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink-800">
                    {version.file_name}
                    {version.version === versionsTarget?.version && (
                      <span className="ml-1.5 rounded bg-brand-100 px-1 py-0.5 text-[8px] font-bold text-brand-700">
                        当前
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-[9px] text-ink-400">
                    {version.revision} · {formatBytes(version.file_size)} · {formatDateTime(version.created_at)}
                    {version.change_note ? ` · ${version.change_note}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-ink-400 transition hover:bg-white hover:text-brand-700"
                  onClick={async () => {
                    try {
                      await api.downloadVersion(versionsTarget!.id, version)
                    } catch (err) {
                      toast(err instanceof Error ? err.message : '下载失败', 'error')
                    }
                  }}
                  title="下载此版本"
                  aria-label="下载此版本"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-xs text-ink-400">暂无版本记录</p>
        )}
      </Modal>
    </div>
  )
}
