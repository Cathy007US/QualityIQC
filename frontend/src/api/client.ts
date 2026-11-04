import type {
  AdminDocumentQuery,
  AdminOverview,
  Category,
  DocumentDetail,
  DocumentQuery,
  DocumentSummary,
  DocumentUpdatePayload,
  DocumentVersion,
  Page,
  PublicStats,
  TokenResponse,
  UploadFields,
  User,
} from './types'

export const TOKEN_KEY = 'iqc_insp_token'
export const USER_KEY = 'iqc_insp_user'
export const AUTH_EXPIRED_EVENT = 'iqc:auth-expired'

const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function readError(response: Response): Promise<ApiError> {
  let message = `请求失败（${response.status}）`
  try {
    const data = await response.json()
    if (typeof data?.detail === 'string') {
      message = data.detail
    } else if (Array.isArray(data?.detail)) {
      message = data.detail
        .map((item: { msg?: string; loc?: unknown[] }) => item.msg || '参数校验失败')
        .join('；')
    }
  } catch {
    // Keep the generic message when the response is not JSON.
  }
  return new ApiError(message, response.status)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value))

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new ApiError('无法连接服务器，请检查网络或稍后重试', 0)
  }

  if (!response.ok) {
    const error = await readError(response)
    if (response.status === 401 && getToken()) {
      clearAuth()
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
    throw error
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function queryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const value = search.toString()
  return value ? `?${value}` : ''
}

export const api = {
  getStats: (lang?: string) => request<PublicStats>(`/stats${queryString({ lang })}`),
  getCategories: (lang?: string) => request<Category[]>(`/categories${queryString({ lang })}`),

  getDocuments: (params: DocumentQuery = {}) =>
    request<Page<DocumentSummary>>(
      `/documents${queryString({
        q: params.q,
        category: params.category,
        doc_type: params.doc_type,
        sort: params.sort,
        page: params.page,
        page_size: params.page_size,
        lang: params.lang,
      })}`,
    ),

  getDocument: (id: number | string, lang?: string) =>
    request<DocumentDetail>(`/documents/${id}${queryString({ lang })}`),

  getRelated: (id: number | string, lang?: string) =>
    request<DocumentSummary[]>(`/documents/${id}/related${queryString({ limit: 4, lang })}`),

  publicDownloadUrl: (id: number | string) => `${API_BASE}/documents/${id}/download`,

  login: (username: string, password: string) =>
    request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<User>('/auth/me'),

  getAdminOverview: () => request<AdminOverview>('/admin/overview'),

  getAdminDocuments: (params: AdminDocumentQuery = {}) =>
    request<Page<DocumentSummary>>(
      `/admin/documents${queryString({
        q: params.q,
        category: params.category,
        doc_type: params.doc_type,
        status: params.status,
        lang: params.lang,
        page: params.page,
        page_size: params.page_size,
      })}`,
    ),

  updateDocument: (id: number, payload: DocumentUpdatePayload) =>
    request<DocumentDetail>(`/admin/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteDocument: (id: number) =>
    request<{ message: string }>(`/admin/documents/${id}`, { method: 'DELETE' }),

  getVersions: (id: number) =>
    request<DocumentVersion[]>(`/admin/documents/${id}/versions`),

  downloadVersion: async (documentId: number, version: DocumentVersion) => {
    const response = await fetch(
      `${API_BASE}/admin/documents/${documentId}/versions/${version.id}/download`,
      { headers: authHeaders() },
    )
    if (!response.ok) {
      const error = await readError(response)
      if (response.status === 401) {
        clearAuth()
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
      }
      throw error
    }
    const blob = await response.blob()
    triggerBlobDownload(blob, `v${version.version}-${version.file_name}`)
  },

  getAdminCategories: () => request<Category[]>('/admin/categories'),

  createCategory: (payload: {
    name: string
    name_en?: string
    slug?: string
    description?: string
    description_en?: string
    color: string
    sort_order?: number
  }) =>
    request<Category>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCategory: (
    id: number,
    payload: Partial<{
      name: string
      name_en: string
      slug: string
      description: string
      description_en: string
      color: string
      sort_order: number
    }>,
  ) =>
    request<Category>(`/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteCategory: (id: number) =>
    request<{ message: string }>(`/admin/categories/${id}`, { method: 'DELETE' }),
}

export function uploadDocument(
  file: File,
  fields: UploadFields,
  onProgress?: (percent: number) => void,
): Promise<DocumentDetail> {
  const form = new FormData()
  form.append('file', file)
  form.append('title', fields.title)
  form.append('locale', fields.locale)
  form.append('category_id', String(fields.category_id))
  form.append('doc_type', fields.doc_type)
  if (fields.document_no) form.append('document_no', fields.document_no)
  if (fields.revision) form.append('revision', fields.revision)
  if (fields.summary) form.append('summary', fields.summary)
  if (fields.product_line) form.append('product_line', fields.product_line)
  if (fields.supplier) form.append('supplier', fields.supplier)
  if (fields.tags) form.append('tags', fields.tags)
  if (fields.effective_date) form.append('effective_date', fields.effective_date)
  if (fields.expiry_date) form.append('expiry_date', fields.expiry_date)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/admin/documents`)
    xhr.setRequestHeader('Authorization', `Bearer ${getToken() ?? ''}`)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () => {
      let data: unknown = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        // Ignore malformed payloads.
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as DocumentDetail)
        return
      }
      const detail = (data as { detail?: string | { msg?: string }[] } | null)?.detail
      let message = `上传失败（${xhr.status}）`
      if (typeof detail === 'string') message = detail
      else if (Array.isArray(detail)) message = detail.map((item) => item.msg).filter(Boolean).join('；')
      if (xhr.status === 401 && getToken()) {
        clearAuth()
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
      }
      reject(new ApiError(message, xhr.status))
    }
    xhr.onerror = () => reject(new ApiError('网络异常，上传中断', 0))
    xhr.send(form)
  })
}

export function replaceDocumentFile(
  documentId: number,
  file: File,
  revision: string,
  changeNote: string,
  onProgress?: (percent: number) => void,
): Promise<DocumentDetail> {
  const form = new FormData()
  form.append('file', file)
  if (revision) form.append('revision', revision)
  if (changeNote) form.append('change_note', changeNote)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/admin/documents/${documentId}/replace`)
    xhr.setRequestHeader('Authorization', `Bearer ${getToken() ?? ''}`)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () => {
      let data: unknown = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        // Ignore malformed payloads.
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as DocumentDetail)
        return
      }
      const detail = (data as { detail?: string } | null)?.detail
      reject(new ApiError(detail || `替换失败（${xhr.status}）`, xhr.status))
    }
    xhr.onerror = () => reject(new ApiError('网络异常，上传中断', 0))
    xhr.send(form)
  })
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
