import { FileSearch } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import type { ReactNode } from 'react'
import type {
  ContentBlock,
  HeadingBlock,
  ImageBlock,
  ListItemBlock,
  PageBreakBlock,
  ParagraphBlock,
  TableBlock,
} from '../api/types'

function TableView({ block }: { block: TableBlock }) {
  if (!block.rows?.length) return null
  const hasHeader = block.header !== false
  const [head, ...body] = block.rows
  return (
    <div className="doc-table-wrap">
      <table>
        {hasHeader && (
          <thead>
            <tr>
              {head.map((cell, index) => (
                <th key={index}>{cell || '—'}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {(hasHeader ? body : block.rows).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell || ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HeadingView({ block }: { block: HeadingBlock }) {
  const level = Number(block.level) || 1
  const content = block.text
  if (level <= 2) return <h2>{content}</h2>
  if (level === 3) return <h3>{content}</h3>
  return <h4>{content}</h4>
}

export function PreviewRenderer({ blocks }: { blocks: ContentBlock[] }) {
  const { t } = useI18n()
  if (!blocks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileSearch className="h-8 w-8 text-ink-300" />
        <p className="mt-3 text-sm font-medium text-ink-500">{t('preview.empty')}</p>
        <p className="mt-1 text-xs text-ink-400">{t('preview.emptyDesc')}</p>
      </div>
    )
  }

  const nodes: ReactNode[] = []
  let listItems: ListItemBlock[] = []

  const flushList = () => {
    if (!listItems.length) return
    nodes.push(
      <ul key={`list-${nodes.length}`}>
        {listItems.map((item, index) => (
          <li key={index}>{item.text}</li>
        ))}
      </ul>,
    )
    listItems = []
  }

  blocks.forEach((block, index) => {
    if (block.type === 'list_item') {
      listItems.push(block)
      return
    }
    flushList()

    if (block.type === 'heading') {
      nodes.push(<HeadingView key={index} block={block} />)
    } else if (block.type === 'paragraph') {
      nodes.push(<ParagraphView key={index} block={block} />)
    } else if (block.type === 'table') {
      nodes.push(<TableView key={index} block={block} />)
    } else if (block.type === 'image') {
      nodes.push(<ImageView key={index} block={block} />)
    } else if (block.type === 'page_break') {
      nodes.push(<PageBreakView key={index} block={block} />)
    }
  })
  flushList()

  return <div className="doc-paper">{nodes}</div>
}

function ParagraphView({ block }: { block: ParagraphBlock }) {
  return <p>{block.text}</p>
}

function PageBreakView({ block }: { block: PageBreakBlock }) {
  const { t } = useI18n()
  return (
    <div className="doc-page-break">
      <span>{t('preview.page', { page: block.page })}</span>
    </div>
  )
}

function ImageView({ block }: { block: ImageBlock }) {
  const { t } = useI18n()
  if (!block.url) return null
  const alt = block.alt && block.alt !== '文档内嵌图片' ? block.alt : t('preview.image')
  return (
    <figure className="doc-image">
      <a href={block.url} target="_blank" rel="noreferrer" title={t('preview.image')}>
        <img
          src={block.url}
          alt={alt}
          width={block.width}
          height={block.height}
          loading="lazy"
        />
      </a>
      {block.alt && block.alt !== '文档内嵌图片' && <figcaption>{block.alt}</figcaption>}
    </figure>
  )
}
