import { CloudUpload, FileText, RefreshCw, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { formatBytes } from '../lib/format'
import { FileIcon, fileKindLabel } from './FileIcon'

interface FileDropzoneProps {
  file: File | null
  onFile: (file: File | null) => void
  onReject?: (message: string) => void
  maxMB?: number
  accept?: string
}

export function FileDropzone({
  file,
  onFile,
  onReject,
  maxMB = 25,
  accept = '.docx,.xlsx,.pdf',
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const validate = (candidate: File) => {
    const ext = `.${candidate.name.split('.').pop()?.toLowerCase() ?? ''}`
    if (!['.docx', '.xlsx', '.pdf'].includes(ext)) {
      onReject?.('仅支持 .docx、.xlsx、.pdf 格式')
      return
    }
    if (candidate.size > maxMB * 1024 * 1024) {
      onReject?.(`文件大小不能超过 ${maxMB}MB`)
      return
    }
    if (candidate.size === 0) {
      onReject?.('文件内容为空，请重新选择')
      return
    }
    onFile(candidate)
  }

  if (file) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
        <FileIcon ext={`.${file.name.split('.').pop()?.toLowerCase() ?? ''}`} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">{file.name}</p>
          <p className="mt-1 text-xs text-ink-500">
            {fileKindLabel(`.${file.name.split('.').pop()?.toLowerCase() ?? ''}`)} · {formatBytes(file.size)}
          </p>
          <p className="mt-0.5 text-[11px] text-brand-700">文件已就绪，提交后将自动解析内容</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="rounded-lg p-2 text-ink-500 transition hover:bg-white hover:text-brand-700"
            onClick={() => inputRef.current?.click()}
            aria-label="更换文件"
            title="更换文件"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-ink-400 transition hover:bg-white hover:text-red-500"
            onClick={() => onFile(null)}
            aria-label="移除文件"
            title="移除文件"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0]
            if (selected) validate(selected)
            event.target.value = ''
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
        dragging
          ? 'border-brand-500 bg-brand-50'
          : 'border-ink-200 bg-ink-50/50 hover:border-brand-300 hover:bg-brand-50/30'
      }`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        const dropped = event.dataTransfer.files?.[0]
        if (dropped) validate(dropped)
      }}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-soft">
        <CloudUpload className="h-6 w-6" />
      </span>
      <p className="mt-4 text-sm font-semibold text-ink-800">
        拖拽标准文件到此处，或{' '}
        <button
          type="button"
          className="text-brand-700 underline decoration-brand-300 underline-offset-4 hover:text-brand-900"
          onClick={() => inputRef.current?.click()}
        >
          选择文件
        </button>
      </p>
      <p className="mt-2 text-xs text-ink-400">支持 Word / Excel / PDF，单个文件不超过 {maxMB}MB</p>
      <div className="mt-4 flex items-center gap-3 text-[10px] font-medium text-ink-400">
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3" /> DOCX
        </span>
        <span className="h-3 w-px bg-ink-200" />
        <span>XLSX</span>
        <span className="h-3 w-px bg-ink-200" />
        <span>PDF</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0]
          if (selected) validate(selected)
          event.target.value = ''
        }}
      />
    </div>
  )
}
