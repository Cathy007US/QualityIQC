export type DocType =
  | 'inspection_spec'
  | 'work_instruction'
  | 'sampling_plan'
  | 'form'
  | 'supplier_standard'
  | 'equipment_sop'
  | 'other'

export type DocumentStatus = 'published' | 'archived'

export interface Category {
  id: number
  name: string
  name_zh: string
  name_en: string | null
  slug: string
  description: string | null
  description_zh: string | null
  description_en: string | null
  color: string
  sort_order: number
  document_count: number
}

export interface DocumentSummary {
  id: number
  document_no: string
  locale: 'zh-CN' | 'en-US'
  title: string
  category: Category
  doc_type: DocType
  doc_type_label: string
  product_line: string | null
  supplier: string | null
  revision: string
  summary: string | null
  tags: string[]
  status: DocumentStatus
  effective_date: string | null
  expiry_date: string | null
  file_name: string
  file_ext: string
  file_size: number
  mime_type: string
  version: number
  download_count: number
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface HeadingBlock {
  type: 'heading'
  level: number
  text: string
}

export interface ParagraphBlock {
  type: 'paragraph'
  text: string
}

export interface ListItemBlock {
  type: 'list_item'
  text: string
  ordered?: boolean
}

export interface TableBlock {
  type: 'table'
  rows: string[][]
  header?: boolean
}

export interface PageBreakBlock {
  type: 'page_break'
  page: number
}

export interface ImageBlock {
  type: 'image'
  asset_id: number
  url: string
  alt?: string
  width?: number
  height?: number
}

export type ContentBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListItemBlock
  | TableBlock
  | PageBreakBlock
  | ImageBlock

export interface DocumentDetail extends DocumentSummary {
  content_blocks: ContentBlock[]
  content_meta: Record<string, unknown>
  previous_versions: number
  alternate_document_id: number | null
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface CategoryStat {
  id: number
  name: string
  slug: string
  color: string
  count: number
}

export interface RecentDocument {
  id: number
  title: string
  document_no: string
  category_name: string
  file_ext: string
  updated_at: string
}

export interface PublicStats {
  document_count: number
  category_count: number
  download_count: number
  type_count: number
  latest_updated_at: string | null
  categories: CategoryStat[]
  recent_documents: RecentDocument[]
  popular_documents: RecentDocument[]
}

export interface User {
  id: number
  username: string
  display_name: string
  role: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface DocumentVersion {
  id: number
  version: number
  revision: string
  file_name: string
  file_size: number
  sha256: string
  change_note: string | null
  created_at: string
}

export interface AdminOverview {
  document_count: number
  category_count: number
  download_count: number
  storage_bytes: number
  archived_count: number
  uploads_last_30d: number
  locale_counts: Record<string, number>
  recent_documents: DocumentSummary[]
  category_stats: CategoryStat[]
}

export interface DocumentQuery {
  q?: string
  category?: string
  doc_type?: string
  sort?: string
  page?: number
  page_size?: number
  lang?: string
}

export interface AdminDocumentQuery extends DocumentQuery {
  status?: DocumentStatus | ''
}

export interface UploadFields {
  title: string
  locale: 'zh-CN' | 'en-US'
  category_id: number
  doc_type: DocType
  document_no?: string
  revision?: string
  summary?: string
  product_line?: string
  supplier?: string
  tags?: string
  effective_date?: string
  expiry_date?: string
}

export interface DocumentUpdatePayload {
  title?: string
  category_id?: number
  doc_type?: DocType
  product_line?: string | null
  supplier?: string | null
  revision?: string
  summary?: string | null
  tags?: string[]
  status?: DocumentStatus
  effective_date?: string | null
  expiry_date?: string | null
}

export const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: 'inspection_spec', label: '检验规范' },
  { value: 'work_instruction', label: '作业指导书' },
  { value: 'sampling_plan', label: '抽样方案' },
  { value: 'form', label: '检验表单' },
  { value: 'supplier_standard', label: '供应商标准' },
  { value: 'equipment_sop', label: '设备操作' },
  { value: 'other', label: '其他' },
]
