import { FileSpreadsheet, FileText, FileType2, type LucideIcon } from 'lucide-react'

interface FileIconProps {
  ext: string
  size?: 'sm' | 'md' | 'lg'
}

const config: Record<string, { icon: LucideIcon; className: string; label: string }> = {
  '.pdf': { icon: FileType2, className: 'bg-red-50 text-red-600', label: 'PDF' },
  '.docx': { icon: FileText, className: 'bg-blue-50 text-blue-600', label: 'DOCX' },
  '.xlsx': { icon: FileSpreadsheet, className: 'bg-emerald-50 text-emerald-600', label: 'XLSX' },
}

const sizes = {
  sm: { wrap: 'h-9 w-9 rounded-lg', icon: 'h-4 w-4' },
  md: { wrap: 'h-11 w-11 rounded-xl', icon: 'h-5 w-5' },
  lg: { wrap: 'h-14 w-14 rounded-2xl', icon: 'h-7 w-7' },
}

export function FileIcon({ ext, size = 'md' }: FileIconProps) {
  const item = config[ext] ?? { icon: FileText, className: 'bg-ink-100 text-ink-500', label: 'FILE' }
  const dims = sizes[size]
  const Icon = item.icon
  return (
    <span className={`flex shrink-0 items-center justify-center ${dims.wrap} ${item.className}`}>
      <Icon className={dims.icon} strokeWidth={1.9} />
    </span>
  )
}

export function fileKindLabel(ext: string): string {
  return config[ext]?.label ?? 'FILE'
}
