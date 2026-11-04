import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 text-center ${
        compact ? 'py-12' : 'py-20'
      }`}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50 text-ink-400">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-sm font-bold text-ink-700">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-xs leading-6 text-ink-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
