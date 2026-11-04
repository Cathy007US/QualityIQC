import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-label="关闭弹窗"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative max-h-[90vh] w-full ${sizes[size]} overflow-y-auto rounded-2xl border border-white/60 bg-white p-5 shadow-float animate-scale-in sm:p-6`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-lg font-bold text-ink-900">
              {title}
            </h2>
            {description && <p className="mt-1 text-xs leading-6 text-ink-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children && <div className="mt-5">{children}</div>}
        {footer && <div className="mt-6 flex justify-end gap-2.5 border-t border-ink-100 pt-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
