import {
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useState, type SyntheticEvent } from 'react'
import { api } from '../../api/client'
import type { Category } from '../../api/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { CATEGORY_COLORS, categoryStyle } from '../../lib/theme'

interface CategoryForm {
  name: string
  name_en: string
  slug: string
  description: string
  description_en: string
  color: string
  sort_order: string
}

const emptyForm: CategoryForm = {
  name: '',
  name_en: '',
  slug: '',
  description: '',
  description_en: '',
  color: 'teal',
  sort_order: '0',
}

export function CategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    try {
      setCategories(await api.getAdminCategories())
    } catch (err) {
      toast(err instanceof Error ? err.message : '分类加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    document.title = '分类管理 · quality-Iqc'
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditing(category)
    setForm({
      name: category.name_zh || category.name,
      name_en: category.name_en || '',
      slug: category.slug,
      description: category.description_zh || category.description || '',
      description_en: category.description_en || '',
      color: category.color || 'teal',
      sort_order: String(category.sort_order),
    })
    setModalOpen(true)
  }

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      toast('分类名称不能为空', 'error')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.updateCategory(editing.id, {
          name: form.name.trim(),
          name_en: form.name_en.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          description_en: form.description_en.trim(),
          color: form.color,
          sort_order: Number(form.sort_order) || 0,
        })
        toast('分类已更新')
      } else {
        await api.createCategory({
          name: form.name.trim(),
          name_en: form.name_en.trim() || undefined,
          slug: form.slug.trim() || undefined,
          description: form.description.trim() || undefined,
          description_en: form.description_en.trim() || undefined,
          color: form.color,
          sort_order: Number(form.sort_order) || 0,
        })
        toast('分类已创建')
      }
      setModalOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      toast(err instanceof Error ? err.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteCategory(deleteTarget.id)
      toast('分类已删除')
      setDeleteTarget(null)
      await load()
    } catch (err) {
      toast(err instanceof Error ? err.message : '删除失败', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-ink-950">光伏物料分类</h2>
          <p className="mt-1 text-xs text-ink-400">
            按电池片、玻璃、胶膜等光伏来料分类，分类会展示在前台筛选与首页导航中。
          </p>
        </div>
        <button type="button" className="btn-primary w-fit" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建分类
        </button>
      </div>

      <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-[11px] leading-5 text-brand-800">
        分类下存在文档时无法删除。若需调整归类，请先在文档管理中将文档转移到其他分类。
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-[180px] rounded-2xl" />
          ))}
        </div>
      ) : categories.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const style = categoryStyle(category.color)
            return (
              <div
                key={category.id}
                className="group rounded-2xl border border-ink-200 bg-white p-5 shadow-soft transition hover:border-brand-200 hover:shadow-card"
              >
                <div className="flex items-start justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.soft} ${style.text}`}>
                    <FolderTree className="h-5 w-5" />
                  </span>
                  <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${style.badge}`}>
                    {category.document_count} 份文档
                  </span>
                </div>
                <h3 className="mt-4 text-[15px] font-bold text-ink-900">{category.name_zh || category.name}</h3>
                {category.name_en && <p className="mt-0.5 text-[11px] font-medium text-ink-500">{category.name_en}</p>}
                <p className="mt-1 font-mono text-[10px] text-ink-400">/{category.slug}</p>
                <p className="mt-2 line-clamp-2 min-h-[32px] text-[11px] leading-5 text-ink-500">
                  {category.description || '暂无分类说明'}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                  <span className="text-[10px] text-ink-400">排序 {category.sort_order}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(category)}
                      className="rounded-lg p-2 text-ink-400 transition hover:bg-blue-50 hover:text-blue-600"
                      title="编辑分类"
                      aria-label="编辑分类"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(category)}
                      disabled={category.document_count > 0}
                      className="rounded-lg p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                      title={category.document_count > 0 ? '分类下存在文档，无法删除' : '删除分类'}
                      aria-label="删除分类"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={FolderTree}
          title="还没有分类"
          description="创建分类后，上传文档时即可选择归类。"
          action={
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              新建分类
            </button>
          }
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? '编辑分类' : '新建分类'}
        description={editing ? `正在编辑「${editing.name}」` : '分类创建后可立即用于文档上传与前台筛选'}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              取消
            </button>
            <button type="button" className="btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? '保存中…' : editing ? '保存修改' : '创建分类'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="category-name" className="label">
              分类名称 <span className="text-red-500">*</span>
            </label>
            <input
              id="category-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="如：电池片检验"
              className="input"
              maxLength={80}
              required
            />
          </div>
          <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">English</p>
            <label htmlFor="category-name-en" className="label">英文名称</label>
            <input
              id="category-name-en"
              value={form.name_en}
              onChange={(event) => setForm((current) => ({ ...current, name_en: event.target.value }))}
              placeholder="e.g. Solar Cell Inspection"
              className="input mb-3"
              maxLength={80}
            />
            <label htmlFor="category-description-en" className="label">英文说明</label>
            <textarea
              id="category-description-en"
              value={form.description_en}
              onChange={(event) => setForm((current) => ({ ...current, description_en: event.target.value }))}
              placeholder="English category description"
              className="input min-h-[64px] resize-y"
              maxLength={300}
            />
          </div>
          <div>
            <label htmlFor="category-slug" className="label">分类标识</label>
            <input
              id="category-slug"
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder="如：solar-cell（留空自动生成）"
              className="input font-mono text-xs"
              maxLength={80}
            />
            <p className="field-hint">仅小写字母、数字和连字符，用于前台 URL 筛选。</p>
          </div>
          <div>
            <label htmlFor="category-description" className="label">分类说明</label>
            <textarea
              id="category-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="简要描述该分类包含的光伏物料与检验范围"
              className="input min-h-[76px] resize-y"
              maxLength={300}
            />
          </div>
          <div>
            <span className="label">标识颜色</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, color: color.value }))}
                  className={`flex h-9 items-center gap-2 rounded-lg border px-2.5 text-[10px] font-medium transition ${
                    form.color === color.value
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-ink-200 bg-white text-ink-500 hover:border-brand-300'
                  }`}
                  title={color.label}
                >
                  <span className={`h-3 w-3 rounded-full ${color.className}`} />
                  {color.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="category-order" className="label">排序</label>
            <input
              id="category-order"
              type="number"
              value={form.sort_order}
              onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
              className="input max-w-[140px]"
            />
            <p className="field-hint">数字越小越靠前。</p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除分类"
        description={`确定删除分类「${deleteTarget?.name ?? ''}」吗？此操作不可撤销。`}
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}
