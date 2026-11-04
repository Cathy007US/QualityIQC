import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileType2,
  Info,
  Layers,
  Loader2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, uploadDocument } from '../../api/client'
import {
  DOC_TYPE_OPTIONS,
  type Category,
  type DocType,
  type DocumentDetail,
} from '../../api/types'
import { FileDropzone } from '../../components/FileDropzone'
import { FileIcon } from '../../components/FileIcon'
import { useToast } from '../../components/Toast'
import { formatBytes } from '../../lib/format'

interface FormState {
  title: string
  locale: 'zh-CN' | 'en-US'
  document_no: string
  category_id: string
  doc_type: DocType
  revision: string
  effective_date: string
  expiry_date: string
  product_line: string
  supplier: string
  summary: string
  tags: string
}

const initialForm: FormState = {
  title: '',
  locale: 'zh-CN',
  document_no: '',
  category_id: '',
  doc_type: 'inspection_spec',
  revision: 'A0',
  effective_date: '',
  expiry_date: '',
  product_line: '',
  supplier: '',
  summary: '',
  tags: '',
}

export function UploadPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<DocumentDetail | null>(null)

  useEffect(() => {
    document.title = '上传标准 · quality-Iqc'
    api
      .getAdminCategories()
      .then((items) => {
        setCategories(items)
        setForm((current) => ({
          ...current,
          category_id: current.category_id || (items[0] ? String(items[0].id) : ''),
        }))
      })
      .catch((err: Error) => toast(err.message, 'error'))
  }, [toast])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) {
      toast('请先选择要上传的标准文件', 'error')
      return
    }
    if (!form.title.trim()) {
      toast('请填写文档标题', 'error')
      return
    }
    if (!form.category_id) {
      toast('请选择文档分类', 'error')
      return
    }
    if (form.effective_date && form.expiry_date && form.expiry_date < form.effective_date) {
      toast('失效日期不能早于生效日期', 'error')
      return
    }

    setSubmitting(true)
    setProgress(0)
    try {
      const document = await uploadDocument(
        file,
        {
          title: form.title.trim(),
          locale: form.locale,
          category_id: Number(form.category_id),
          doc_type: form.doc_type,
          document_no: form.document_no.trim() || undefined,
          revision: form.revision.trim() || 'A0',
          summary: form.summary.trim() || undefined,
          product_line: form.product_line.trim() || undefined,
          supplier: form.supplier.trim() || undefined,
          tags: form.tags.trim() || undefined,
          effective_date: form.effective_date || undefined,
          expiry_date: form.expiry_date || undefined,
        },
        setProgress,
      )
      setResult(document)
      setFile(null)
      toast('标准上传成功，已发布到公开文库')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      toast(err instanceof Error ? err.message : '上传失败，请稍后重试', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForNext = () => {
    setResult(null)
    setFile(null)
    setForm((current) => ({
      ...initialForm,
      category_id: current.category_id,
    }))
    setProgress(0)
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-card">
          <div className="bg-brand-900 px-6 py-8 text-center text-white">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-400/20 text-brand-200">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-xl font-bold">标准上传成功</h2>
            <p className="mt-1.5 text-xs text-brand-100/60">文档已完成解析，并发布至公开标准文库</p>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4 rounded-xl border border-ink-200 bg-ink-50/60 p-4">
              <FileIcon ext={result.file_ext} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">{result.title}</p>
                <p className="mt-1 font-mono text-[10px] text-ink-400">{result.document_no}</p>
                <p className="mt-1 text-[10px] text-ink-500">
                  {result.category.name} · {result.doc_type_label} · {formatBytes(result.file_size)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-brand-50 px-3 py-3 text-center">
                <p className="text-lg font-bold text-brand-800">{result.content_blocks.length}</p>
                <p className="text-[9px] text-brand-600">已解析内容块</p>
              </div>
              <div className="rounded-xl bg-ink-50 px-3 py-3 text-center">
                <p className="text-lg font-bold text-ink-800">v{result.version}</p>
                <p className="text-[9px] text-ink-400">当前版本</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-3 text-center">
                <p className="text-lg font-bold text-amber-700">公开</p>
                <p className="text-[9px] text-amber-600">文库可见</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Link to={`/${result.locale === 'en-US' ? 'en' : 'zh'}/documents/${result.id}`} className="btn-primary flex-1">
                查看文档
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button type="button" className="btn-secondary flex-1" onClick={resetForNext}>
                <UploadCloud className="h-4 w-4" />
                继续上传
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-950">上传光伏检验标准</h2>
        <p className="mt-1 text-xs text-ink-400">
          支持电池片、玻璃、胶膜、边框、接线盒、焊带等来料标准；上传后自动解析并发布到公开文库。
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_312px] xl:items-start">
        <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
          <div className="border-b border-ink-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-900 text-[10px] font-bold text-white">
                1
              </span>
              <h3 className="text-sm font-bold text-ink-900">选择文件</h3>
            </div>
            <div className="mt-4">
              <FileDropzone
                file={file}
                onFile={setFile}
                onReject={(message) => toast(message, 'error')}
              />
            </div>
          </div>

          <div className="border-b border-ink-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-900 text-[10px] font-bold text-white">
                2
              </span>
              <h3 className="text-sm font-bold text-ink-900">填写文档信息</h3>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="title" className="label">
                  文档标题 <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  value={form.title}
                  onChange={(event) => update('title', event.target.value)}
                  placeholder="如：182mm 单晶电池片来料检验规范"
                  className="input"
                  maxLength={240}
                  required
                />
              </div>

              <div>
                <label htmlFor="locale" className="label">
                  文档语言 <span className="text-red-500">*</span>
                </label>
                <select
                  id="locale"
                  value={form.locale}
                  onChange={(event) => update('locale', event.target.value as FormState['locale'])}
                  className="input"
                >
                  <option value="zh-CN">中文（zh-CN）</option>
                  <option value="en-US">English（en-US）</option>
                </select>
                <p className="field-hint">同一标准编号可分别上传中英文受控文件。</p>
              </div>

              <div>
                <label htmlFor="document_no" className="label">文档编号</label>
                <input
                  id="document_no"
                  value={form.document_no}
                  onChange={(event) => update('document_no', event.target.value)}
                  placeholder="留空自动生成"
                  className="input font-mono text-xs"
                  maxLength={64}
                />
                <p className="field-hint">建议使用受控编号，如 PV-IQC-WI-001。</p>
              </div>

              <div>
                <label htmlFor="revision" className="label">版本 / 修订号</label>
                <input
                  id="revision"
                  value={form.revision}
                  onChange={(event) => update('revision', event.target.value)}
                  placeholder="A0"
                  className="input"
                  maxLength={32}
                />
              </div>

              <div>
                <label htmlFor="category" className="label">
                  所属分类 <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  value={form.category_id}
                  onChange={(event) => update('category_id', event.target.value)}
                  className="input"
                  required
                >
                  <option value="">请选择分类</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                {!categories.length && (
                  <p className="field-hint text-amber-700">
                    暂无分类，请先在
                    <Link to="/admin/categories" className="mx-1 underline">分类管理</Link>
                    中创建。
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="doc_type" className="label">
                  文档类型 <span className="text-red-500">*</span>
                </label>
                <select
                  id="doc_type"
                  value={form.doc_type}
                  onChange={(event) => update('doc_type', event.target.value as DocType)}
                  className="input"
                >
                  {DOC_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="effective_date" className="label">生效日期</label>
                <input
                  id="effective_date"
                  type="date"
                  value={form.effective_date}
                  onChange={(event) => update('effective_date', event.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="expiry_date" className="label">失效日期</label>
                <input
                  id="expiry_date"
                  type="date"
                  value={form.expiry_date}
                  onChange={(event) => update('expiry_date', event.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="product_line" className="label">适用产线 / 产品</label>
                <input
                  id="product_line"
                  value={form.product_line}
                  onChange={(event) => update('product_line', event.target.value)}
                  placeholder="如：组件一厂 / 182 系列"
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="supplier" className="label">适用供应商</label>
                <input
                  id="supplier"
                  value={form.supplier}
                  onChange={(event) => update('supplier', event.target.value)}
                  placeholder="如：XX 光伏材料"
                  className="input"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="summary" className="label">内容摘要</label>
                <textarea
                  id="summary"
                  value={form.summary}
                  onChange={(event) => update('summary', event.target.value)}
                  placeholder="留空将自动截取正文首段作为摘要"
                  className="input min-h-[88px] resize-y"
                  maxLength={1000}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="tags" className="label">标签</label>
                <input
                  id="tags"
                  value={form.tags}
                  onChange={(event) => update('tags', event.target.value)}
                  placeholder="用逗号分隔，如：电池片, EL, 隐裂, 尺寸"
                  className="input"
                />
                <p className="field-hint">最多 12 个标签，便于搜索与关联。</p>
              </div>
            </div>
          </div>

          <div className="bg-ink-50/60 px-5 py-4 sm:px-6">
            {submitting && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-[10px] font-semibold text-ink-500">
                  <span>正在上传并解析文件…</span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-200">
                  <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1.5 text-[10px] text-ink-400">解析时间取决于文件大小与内容，请勿关闭页面。</p>
              </div>
            )}
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p className="flex items-center gap-1.5 text-[10px] text-ink-400">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
                上传后立即发布，可在文档管理中随时下架
              </p>
              <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                {submitting ? '上传中…' : '上传并发布'}
              </button>
            </div>
          </div>
        </form>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <Sparkles className="h-4 w-4 text-amber-500" />
              自动解析说明
            </h3>
            <ul className="mt-4 space-y-3 text-[11px] leading-5 text-ink-500">
              <li className="flex gap-2.5">
                <FileType2 className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span><strong className="text-ink-700">PDF：</strong>提取可复制文本；扫描件无法识别，请先 OCR。</span>
              </li>
              <li className="flex gap-2.5">
                <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span><strong className="text-ink-700">Excel：</strong>按工作表提取表格，最多保留 500 行。</span>
              </li>
              <li className="flex gap-2.5">
                <Layers className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span><strong className="text-ink-700">Word：</strong>按标题层级、段落和表格还原正文结构。</span>
              </li>
            </ul>
            <div className="mt-4 rounded-lg bg-ink-50 px-3 py-2.5 text-[10px] leading-5 text-ink-400">
              单个文件不超过 25MB；相同文件内容会被拒绝重复上传。EL 图片、曲线图不做图像识别，请确保判定文字可提取。
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-5">
            <h3 className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              上传前检查
            </h3>
            <ul className="mt-3 space-y-2 text-[10px] leading-5 text-amber-900/65">
              <li>• 确认电池片效率档、玻璃镀膜类型、胶膜型号与文件一致。</li>
              <li>• 标题包含物料 / 工序 / 标准类型，如“电池片 EL 检验规范”。</li>
              <li>• 生效日期、版本号与文件封面保持一致。</li>
              <li>• 涉及供应商配方或机密时，请先确认公开范围。</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-soft">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-500">
              <Info className="h-3.5 w-3.5 text-brand-600" />
              发布后可见范围
            </p>
            <p className="mt-1.5 text-[10px] leading-5 text-ink-400">
              文档将立即出现在公开标准文库中，无需登录即可浏览和下载。如需撤回，请在文档管理中下架。
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
