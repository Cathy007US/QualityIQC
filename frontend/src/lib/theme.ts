export interface CategoryStyle {
  badge: string
  soft: string
  text: string
  dot: string
  border: string
  button: string
}

const styles: Record<string, CategoryStyle> = {
  teal: {
    badge: 'bg-teal-50 text-teal-700 ring-teal-600/10',
    soft: 'bg-teal-50',
    text: 'text-teal-700',
    dot: 'bg-teal-500',
    border: 'border-teal-200',
    button: 'hover:border-teal-300 hover:bg-teal-50/60',
  },
  blue: {
    badge: 'bg-blue-50 text-blue-700 ring-blue-600/10',
    soft: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    border: 'border-blue-200',
    button: 'hover:border-blue-300 hover:bg-blue-50/60',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    soft: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    border: 'border-amber-200',
    button: 'hover:border-amber-300 hover:bg-amber-50/60',
  },
  violet: {
    badge: 'bg-violet-50 text-violet-700 ring-violet-600/10',
    soft: 'bg-violet-50',
    text: 'text-violet-700',
    dot: 'bg-violet-500',
    border: 'border-violet-200',
    button: 'hover:border-violet-300 hover:bg-violet-50/60',
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700 ring-rose-600/10',
    soft: 'bg-rose-50',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    border: 'border-rose-200',
    button: 'hover:border-rose-300 hover:bg-rose-50/60',
  },
  cyan: {
    badge: 'bg-cyan-50 text-cyan-700 ring-cyan-600/10',
    soft: 'bg-cyan-50',
    text: 'text-cyan-700',
    dot: 'bg-cyan-500',
    border: 'border-cyan-200',
    button: 'hover:border-cyan-300 hover:bg-cyan-50/60',
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    soft: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200',
    button: 'hover:border-emerald-300 hover:bg-emerald-50/60',
  },
  indigo: {
    badge: 'bg-indigo-50 text-indigo-700 ring-indigo-600/10',
    soft: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500',
    border: 'border-indigo-200',
    button: 'hover:border-indigo-300 hover:bg-indigo-50/60',
  },
  orange: {
    badge: 'bg-orange-50 text-orange-700 ring-orange-600/10',
    soft: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    border: 'border-orange-200',
    button: 'hover:border-orange-300 hover:bg-orange-50/60',
  },
  slate: {
    badge: 'bg-slate-50 text-slate-700 ring-slate-600/10',
    soft: 'bg-slate-50',
    text: 'text-slate-700',
    dot: 'bg-slate-500',
    border: 'border-slate-200',
    button: 'hover:border-slate-300 hover:bg-slate-50/60',
  },
}

export function categoryStyle(color?: string): CategoryStyle {
  return styles[color ?? ''] ?? styles.teal
}

export const CATEGORY_COLORS = [
  { value: 'teal', label: '青绿', className: 'bg-teal-500' },
  { value: 'blue', label: '蓝色', className: 'bg-blue-500' },
  { value: 'amber', label: '琥珀', className: 'bg-amber-500' },
  { value: 'violet', label: '紫罗兰', className: 'bg-violet-500' },
  { value: 'rose', label: '玫红', className: 'bg-rose-500' },
  { value: 'cyan', label: '青色', className: 'bg-cyan-500' },
  { value: 'emerald', label: '翠绿', className: 'bg-emerald-500' },
  { value: 'indigo', label: '靛蓝', className: 'bg-indigo-500' },
  { value: 'orange', label: '橙色', className: 'bg-orange-500' },
  { value: 'slate', label: '岩灰', className: 'bg-slate-500' },
]
