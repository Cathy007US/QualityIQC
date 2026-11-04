const formatterCache = new Map<string, Intl.DateTimeFormat>()

function getDateFormatter(locale: string): Intl.DateTimeFormat {
  const key = `date:${locale}`
  let formatter = formatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    formatterCache.set(key, formatter)
  }
  return formatter
}

function getDateTimeFormatter(locale: string): Intl.DateTimeFormat {
  const key = `datetime:${locale}`
  let formatter = formatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    formatterCache.set(key, formatter)
  }
  return formatter
}

export function formatDate(
  value?: string | null,
  locale = 'zh-CN',
  notSet = '未设置',
): string {
  if (!value) return notSet
  // Date-only values (effective_date) must not be shifted by the browser timezone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return getDateFormatter(locale).format(date).replaceAll('/', '-')
}

export function formatDateTime(value?: string | null, locale = 'zh-CN'): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return getDateTimeFormatter(locale).format(date).replaceAll('/', '-')
}

export function formatRelative(value?: string | null, locale = 'zh-CN'): string {
  if (!value) return '—'
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  const english = locale === 'en-US'
  if (diff < minute) return english ? 'just now' : '刚刚'
  if (diff < hour) {
    return english
      ? `${Math.floor(diff / minute)} min ago`
      : `${Math.floor(diff / minute)} 分钟前`
  }
  if (diff < day) {
    return english
      ? `${Math.floor(diff / hour)} h ago`
      : `${Math.floor(diff / hour)} 小时前`
  }
  if (diff < day * 30) {
    return english
      ? `${Math.floor(diff / day)} d ago`
      : `${Math.floor(diff / day)} 天前`
  }
  return formatDate(value, locale)
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`
}

export function formatNumber(value: number, locale = 'zh-CN'): string {
  return new Intl.NumberFormat(locale).format(value)
}

export function fileExtensionLabel(ext: string): string {
  return ext.replace('.', '').toUpperCase() || 'FILE'
}

export function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length)}…` : value
}
