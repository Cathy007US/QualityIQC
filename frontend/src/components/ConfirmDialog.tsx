import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '确认删除',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            取消
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? '处理中…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50/70 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
        <p className="text-sm leading-6 text-red-800">{description}</p>
      </div>
    </Modal>
  )
}
