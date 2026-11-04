import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { useLocaleNavigate } from './LocalizedLink'

interface SearchBarProps {
  initialValue?: string
  placeholder?: string
  size?: 'md' | 'lg'
  onSubmit?: (value: string) => void
  className?: string
}

export function SearchBar({
  initialValue = '',
  placeholder,
  size = 'lg',
  onSubmit,
  className = '',
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue)
  const navigate = useLocaleNavigate()
  const { t } = useI18n()

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const query = value.trim()
    if (onSubmit) {
      onSubmit(query)
      return
    }
    navigate(query ? `/documents?q=${encodeURIComponent(query)}` : '/documents')
  }

  const tall = size === 'lg'

  return (
    <form
      onSubmit={submit}
      role="search"
      className={`group flex items-center rounded-2xl border border-ink-200 bg-white p-1.5 shadow-card transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10 ${
        tall ? 'sm:p-2' : ''
      } ${className}`}
    >
      <Search
        className={`ml-2.5 shrink-0 text-ink-400 transition group-focus-within:text-brand-600 ${
          tall ? 'h-5 w-5' : 'h-4 w-4'
        }`}
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder ?? t('search.placeholder')}
        aria-label={t('search.button')}
        className={`min-w-0 flex-1 bg-transparent px-3 text-ink-900 placeholder:text-ink-400 ${
          tall ? 'py-2.5 text-[15px]' : 'py-2 text-sm'
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="mr-1 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
          aria-label={t('search.clear')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <button
        type="submit"
        className={`btn-primary shrink-0 rounded-xl ${tall ? 'px-4 py-2.5 sm:px-5' : 'px-3 py-2'}`}
      >
        {t('search.button')}
      </button>
    </form>
  )
}
