import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const tones = {
  success: 'border-brand-200 bg-white text-brand-900',
  error: 'border-red-200 bg-white text-red-900',
  info: 'border-ink-200 bg-white text-ink-900',
}

const iconTones = {
  success: 'text-brand-600',
  error: 'text-red-500',
  info: 'text-blue-500',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      counter.current += 1
      const id = counter.current
      setItems((current) => [...current.slice(-3), { id, message, kind }])
      window.setTimeout(() => remove(id), 4200)
    },
    [remove],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-5 sm:top-5">
        {items.map((item) => {
          const Icon = icons[item.kind]
          return (
            <div
              key={item.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-float animate-scale-in ${tones[item.kind]}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconTones[item.kind]}`} />
              <p className="flex-1 text-sm font-medium leading-6">{item.message}</p>
              <button
                type="button"
                className="rounded-md p-0.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                onClick={() => remove(item.id)}
                aria-label="关闭提示"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
