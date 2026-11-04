import {
  ArrowRight,
  ArrowUpRight,
  Download,
  Files,
  FolderTree,
  HardDrive,
  Plus,
  RefreshCw,
  UploadCloud,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import type { AdminOverview } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { FileIcon } from '../../components/FileIcon'
import { formatBytes, formatDate, formatNumber } from '../../lib/format'
import { categoryStyle } from '../../lib/theme'

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-28 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="skeleton h-[400px] rounded-2xl" />
        <div className="skeleton h-[400px] rounded-2xl" />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = '管理概览 · quality-Iqc'
    let active = true
    api
      .getAdminOverview()
      .then((overview) => {
        if (active) setData(overview)
      })
      .catch((err: Error) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) return <DashboardSkeleton />

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50/60 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-red-700">概览加载失败</p>
        <p className="mt-1 text-xs text-red-600/80">{error || '请稍后重试'}</p>
        <button type="button" className="btn-secondary mt-4" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" />
          刷新页面
        </button>
      </div>
    )
  }

  const maxCategory = Math.max(...data.category_stats.map((item) => item.count), 1)

  const stats = [
    {
      label: '在库文档',
      value: formatNumber(data.document_count),
      suffix: '份',
      note: `近 30 天新增 ${data.uploads_last_30d} 份`,
      icon: Files,
      tone: 'bg-brand-50 text-brand-700',
    },
    {
      label: '光伏物料',
      value: String(data.category_count),
      suffix: '类',
      note: `${data.archived_count} 份文档已归档`,
      icon: FolderTree,
      tone: 'bg-blue-50 text-blue-600',
    },
    {
      label: '累计下载',
      value: formatNumber(data.download_count),
      suffix: '次',
      note: '来自公开文库下载',
      icon: Download,
      tone: 'bg-amber-50 text-amber-600',
    },
    {
      label: '原始文件体积',
      value: formatBytes(data.storage_bytes),
      suffix: '',
      note: '当前在库文档合计',
      icon: HardDrive,
      tone: 'bg-violet-50 text-violet-600',
    },
  ]

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-brand-950 px-6 py-6 text-white shadow-card sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-20" />
        <div className="pointer-events-none absolute -right-10 -top-24 h-56 w-56 rounded-full border-[28px] border-brand-400/10" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300/60">Quality Management</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">你好，{user?.display_name || '管理员'}</h2>
            <p className="mt-1.5 text-xs leading-6 text-brand-100/50">
              当前收录 {data.document_count} 份光伏检验标准，最近 30 天新增 {data.uploads_last_30d} 份。
              覆盖电池片、玻璃、胶膜、边框、接线盒与焊带辅材，请及时维护版本与生效状态。
            </p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-brand-200/45">
              <span>中文 {data.locale_counts['zh-CN'] ?? 0} 份</span>
              <span>English {data.locale_counts['en-US'] ?? 0} 份</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Link to="/admin/upload" className="btn bg-white text-brand-900 hover:bg-brand-50">
              <Plus className="h-4 w-4" />
              上传新标准
            </Link>
            <Link to="/admin/documents" className="btn border border-white/20 text-white hover:bg-white/10">
              管理文档
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-300">Overview</span>
              </div>
              <p className="mt-4 text-2xl font-black tracking-tight text-ink-950">
                {stat.value}
                {stat.suffix && <span className="ml-1 text-xs font-semibold text-ink-400">{stat.suffix}</span>}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-ink-500">{stat.label}</p>
              <p className="mt-2 text-[10px] text-ink-400">{stat.note}</p>
            </div>
          )
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-ink-900">最近更新</h2>
              <p className="mt-0.5 text-[10px] text-ink-400">按最后更新时间排序</p>
            </div>
            <Link to="/admin/documents" className="text-[11px] font-semibold text-brand-700 hover:text-brand-900">
              全部文档
            </Link>
          </div>

          {data.recent_documents.length ? (
            <div className="divide-y divide-ink-100">
              {data.recent_documents.map((document) => (
                <div key={document.id} className="flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-brand-50/30">
                  <FileIcon ext={document.file_ext} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/${document.locale === 'en-US' ? 'en' : 'zh'}/documents/${document.id}`}
                      className="block truncate text-[12px] font-semibold text-ink-800 transition hover:text-brand-700"
                    >
                      {document.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] text-ink-400">
                      <span className="font-mono">{document.document_no}</span>
                      <span className="text-brand-700">{document.category.name}</span>
                      <span>v{document.version} · {formatDate(document.updated_at)}</span>
                    </div>
                  </div>
                  <Link
                    to={`/admin/documents?q=${encodeURIComponent(document.document_no)}`}
                    className="rounded-lg p-1.5 text-ink-300 transition hover:bg-white hover:text-brand-700"
                    aria-label="在文档管理中打开"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <UploadCloud className="mx-auto h-8 w-8 text-ink-300" />
              <p className="mt-3 text-xs font-semibold text-ink-500">还没有上传任何光伏标准</p>
              <Link to="/admin/upload" className="btn-primary mt-4 py-2 text-xs">
                上传第一份标准
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink-900">物料分布</h2>
              <p className="mt-0.5 text-[10px] text-ink-400">各光伏物料在库标准数量</p>
            </div>
            <Link to="/admin/categories" className="text-[11px] font-semibold text-brand-700 hover:text-brand-900">
              管理分类
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {data.category_stats.map((category) => {
              const style = categoryStyle(category.color)
              return (
                <div key={category.id}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 font-semibold text-ink-700">
                      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                      {category.name}
                    </span>
                    <span className="font-mono text-[10px] text-ink-400">{category.count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={`h-full rounded-full ${style.dot} transition-all duration-500`}
                      style={{ width: `${Math.max((category.count / maxCategory) * 100, category.count ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 rounded-xl bg-ink-50 p-3.5">
            <p className="text-[10px] font-bold text-ink-600">维护建议</p>
            <p className="mt-1.5 text-[10px] leading-5 text-ink-400">
              对已失效的电池片、胶膜或玻璃标准及时下架；更新判定要求时使用“替换文件”保留历史版本。
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
