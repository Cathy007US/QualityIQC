import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export type Locale = 'zh-CN' | 'en-US'
export type LocalePrefix = 'zh' | 'en'

interface I18nContextValue {
  locale: Locale
  prefix: LocalePrefix
  t: (key: string, vars?: Record<string, string | number>) => string
  localePath: (path: string) => string
  switchLocale: (next: Locale) => void
  setAlternatePath: (path: string | null) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

const messages: Record<Locale, Record<string, string>> = {
  'zh-CN': {
    'brand.name': 'quality-Iqc',
    'brand.home': 'quality-Iqc 太阳能 IQC 检验标准知识库首页',
    'nav.home': '首页',
    'nav.library': '标准文库',
    'header.public': '公开查阅',
    'header.admin': '管理后台',
    'header.login': '管理登录',
    'header.menu': '打开菜单',
    'header.close': '关闭菜单',
    'locale.zh': '中文',
    'locale.en': 'English',
    'locale.switch': '切换语言',
    'search.placeholder': '搜索电池片、玻璃、胶膜或检验项目…',
    'search.button': '搜索',
    'search.clear': '清空搜索',
    'footer.desc':
      '集中沉淀光伏电池片、玻璃、胶膜、边框、接线盒与焊带辅材的 IQC 检验标准，让每一批光伏来料有据可依。',
    'footer.badge': '仅上传与管理需要登录，浏览公开',
    'footer.quick': '快速入口',
    'footer.home': '知识库首页',
    'footer.all': '浏览全部标准',
    'footer.login': '管理员登录',
    'footer.upload': '上传新标准',
    'footer.guide': '使用说明',
    'footer.support': '支持 Word、Excel、PDF 文档在线阅读与下载',
    'footer.contact': '标准更新或失效请联系光伏质量部管理员',
    'footer.copyright': '© {year} quality-Iqc · 太阳能 IQC 检验标准知识库',
    'footer.note': '现场使用时，请以受控版本及最新发布状态为准。',
    'home.badge': 'SOLAR PV IQC · 标准在线',
    'home.title1': '让每一批',
    'home.titleHighlight': '光伏来料',
    'home.title2': '都有标准可依',
    'home.subtitle':
      '集中管理电池片、光伏玻璃、封装胶膜、铝边框、接线盒与焊带辅材的检验规范、作业指导书、抽样方案和检验表单。',
    'home.hot': '热门搜索',
    'home.search.1': '电池片 EL',
    'home.search.2': '玻璃透光率',
    'home.search.3': 'EVA 交联度',
    'home.search.4': '边框膜厚',
    'home.search.5': '接线盒 IP68',
    'home.trust.public': '公开浏览，无需登录',
    'home.trust.coverage': '覆盖 6 类光伏来料',
    'home.trust.formats': '支持 DOCX / XLSX / PDF',
    'home.trust.version': '版本受控可追溯',
    'home.visual.controlled': 'PV IQC · CONTROLLED',
    'home.visual.controlledBadge': '受控',
    'home.visual.fallbackNo': 'PV-IQC-WI-001',
    'home.visual.fallbackTitle': '单晶电池片来料检验规范',
    'home.visual.fallbackCategory': '电池片检验',
    'home.visual.description': '适用于光伏来料检验，现场执行时请确认最新版本与生效日期。',
    'home.visual.status': '受控状态',
    'home.visual.statusValue': '已发布 · 公开查阅',
    'home.visual.sampling': '抽样依据',
    'home.visual.updated': '更新日期',
    'home.visual.publisher': '光伏质量部发布',
    'home.visual.recorded': '已收录标准',
    'home.visual.latest': '最近更新 {date}',
    'home.unit.docs': '份',
    'home.unit.groups': '类',
    'home.unit.downloads': '次',
    'home.stats.documents': '已收录标准',
    'home.stats.categories': '光伏物料分类',
    'home.stats.downloads': '累计下载',
    'home.stats.updated': '最近更新时间',
    'home.categories.eyebrow': 'BROWSE BY PV MATERIAL',
    'home.categories.title': '按光伏物料查找',
    'home.categories.subtitle': '从电池片、玻璃、胶膜到边框与接线盒，快速进入对应检验标准集合。',
    'home.categories.all': '全部标准',
    'home.categories.error': '暂时无法加载分类，请刷新页面重试。',
    'home.categories.open': '进入分类浏览',
    'home.categories.count': '{count} 份',
    'home.recent.eyebrow': 'RECENTLY UPDATED',
    'home.recent.title': '最近更新',
    'home.recent.more': '查看更多',
    'home.popular.eyebrow': 'MOST DOWNLOADED',
    'home.popular.title': '热门下载',
    'home.popular.more': '查看下载排行',
    'home.popular.empty': '暂无下载数据',
    'home.how.eyebrow': 'HOW IT WORKS',
    'home.how.title': '三步找到可执行的光伏检验标准',
    'home.how.desc': '覆盖电池片、玻璃、胶膜、边框、接线盒与焊带辅材；上传、替换和下架需要管理员登录并留痕。',
    'home.how.1.title': '定位检验标准',
    'home.how.1.desc': '输入电池片、玻璃、胶膜或检验项目关键词，按光伏物料快速定位。',
    'home.how.2.title': '在线核对要求',
    'home.how.2.desc': '无需下载即可阅读外观、EL、尺寸与可靠性判定要求，确认版本与生效日期。',
    'home.how.3.title': '下载受控文件',
    'home.how.3.desc': '获取受控原文件，用于来料检验、供应商沟通与质量培训。',
    'home.cta.label': 'QUALITY STARTS HERE',
    'home.cta.title': '光伏标准更新了吗？从最新版本开始核对',
    'home.cta.desc': '现场执行前请确认文档版本、生效日期与发布状态。如发现电池片、玻璃或胶膜标准缺失、过期，请联系光伏质量部管理员。',
    'home.cta.browse': '浏览标准库',
    'home.cta.login': '管理登录',
    'docs.pagination': '分页',
    'docs.eyebrow': 'PV STANDARD LIBRARY',
    'docs.title': '光伏标准文库',
    'docs.subtitle': '按关键词、光伏物料分类或文档类型检索，覆盖电池片、玻璃、胶膜、边框、接线盒与焊带辅材。',
    'docs.count': '{count} 份标准',
    'docs.keyword': '关键词 “{q}”',
    'docs.filter': '筛选',
    'docs.sortLabel': '排序方式',
    'docs.closeFilters': '收起筛选',
    'docs.sort.updated': '最近更新',
    'docs.sort.downloads': '下载最多',
    'docs.sort.title': '标题排序',
    'docs.category': '光伏物料',
    'docs.all': '全部分类',
    'docs.clear': '清除',
    'docs.docType': '文档类型',
    'docs.typeAll': '全部',
    'docs.resetAll': '重置全部筛选',
    'docs.current': '当前筛选',
    'docs.keywordFilter': '关键词：{q}',
    'docs.loading': '检索中…',
    'docs.error': '加载失败',
    'docs.retry': '重新加载',
    'docs.emptyFiltered': '没有找到匹配的标准',
    'docs.emptyFilteredDesc': '试试更换关键词，或清除分类与文档类型筛选后再检索。',
    'docs.empty': '标准库还是空的',
    'docs.emptyDesc': '管理员上传第一份检验标准后，将在这里公开展示。',
    'docs.reset': '清除筛选条件',
    'docs.pager': '共 {total} 条，第 {page} / {pages} 页',
    'docs.prev': '上一页',
    'docs.next': '下一页',
    'docs.page': '第 {page} 页',
    'card.noSummary': '该标准暂无摘要，点击查看完整内容。',
    'card.download': '下载 {title}',
    'card.original': '下载原文件',
    'detail.home': '首页',
    'detail.library': '标准文库',
    'detail.published': '已发布',
    'detail.version': '版本 {revision} · v{version}',
    'detail.updated': '更新于 {date}',
    'detail.copy': '复制链接',
    'detail.copied': '已复制',
    'detail.download': '下载原文件',
    'detail.preview': '文档正文预览',
    'detail.pages': '{count} 页',
    'detail.pages.one': '{count} 页',
    'detail.pages.other': '{count} 页',
    'detail.sheets': '{count} 个工作表',
    'detail.sheets.one': '{count} 个工作表',
    'detail.sheets.other': '{count} 个工作表',
    'detail.paragraphs': '{paragraphs} 段落 / {tables} 表格',
    'detail.images': '{count} 张图片',
    'detail.images.one': '{count} 张图片',
    'detail.images.other': '{count} 张图片',
    'detail.downloadsValue': '{count} 次',
    'detail.downloads.one': '{count} 次',
    'detail.downloads.other': '{count} 次',
    'detail.invalid': '无效的文档编号',
    'detail.breadcrumb': '面包屑',
    'detail.relatedEyebrow': 'RELATED STANDARDS',
    'detail.autoParse': '自动解析',
    'detail.previewNote': '在线预览由系统自动解析生成，复杂排版可能存在差异。现场执行与判定请以下载的受控原文件为准。',
    'detail.fileInfo': '文件信息',
    'detail.docNo': '文档编号',
    'detail.versionLabel': '版本 / 修订',
    'detail.effective': '生效日期',
    'detail.updatedLabel': '更新时间',
    'detail.downloads': '下载次数',
    'detail.publisher': '发布人',
    'detail.fileSize': '文件大小',
    'detail.productLine': '适用产线',
    'detail.supplier': '适用供应商',
    'detail.downloadControlled': '下载受控原文件',
    'detail.publicDownload': '公开下载',
    'detail.tags': '标签',
    'detail.usage': '使用提示',
    'detail.summary': '内容摘要',
    'detail.related': '同类标准',
    'detail.more': '查看更多',
    'detail.noRelated': '当前分类下暂无其他公开标准',
    'detail.notFound': '无法打开该文档',
    'detail.notFoundDesc': '文档可能已被下架或删除，请联系光伏质量部管理员确认。',
    'detail.back': '返回标准文库',
    'detail.linkCopied': '文档链接已复制',
    'detail.copyFailed': '复制失败，请手动复制浏览器地址',
    'preview.empty': '暂无可预览的文本内容',
    'preview.emptyDesc': '请下载原文件查看，或联系管理员重新上传可解析的文档。',
    'preview.page': '第 {page} 页',
    'preview.image': '文档内嵌图片',
    'notfound.title': '页面走丢了',
    'notfound.desc': '你访问的页面不存在或已被移动。可以返回首页，或到标准文库继续检索。',
    'notfound.home': '返回首页',
    'notfound.search': '检索标准',
    'doctype.inspection_spec': '检验规范',
    'doctype.work_instruction': '作业指导书',
    'doctype.sampling_plan': '抽样方案',
    'doctype.form': '检验表单',
    'doctype.supplier_standard': '供应商标准',
    'doctype.equipment_sop': '设备操作',
    'doctype.other': '其他',
    'common.notSet': '未设置',
  },
  'en-US': {
    'brand.name': 'quality-Iqc',
    'brand.home': 'quality-Iqc solar IQC standards library home',
    'nav.home': 'Home',
    'nav.library': 'Standards',
    'header.public': 'Public access',
    'header.admin': 'Admin',
    'header.login': 'Admin login',
    'header.menu': 'Open menu',
    'header.close': 'Close menu',
    'locale.zh': '中文',
    'locale.en': 'English',
    'locale.switch': 'Switch language',
    'search.placeholder': 'Search cells, glass, film or inspection items…',
    'search.button': 'Search',
    'search.clear': 'Clear search',
    'footer.desc':
      'A single library for IQC standards covering solar cells, PV glass, encapsulants, frames, junction boxes and ribbon materials.',
    'footer.badge': 'Public browsing · Sign-in required for uploads',
    'footer.quick': 'Quick links',
    'footer.home': 'Library home',
    'footer.all': 'Browse all standards',
    'footer.login': 'Admin login',
    'footer.upload': 'Upload a standard',
    'footer.guide': 'How to use',
    'footer.support': 'Read Word, Excel and PDF documents online or download the original',
    'footer.contact': 'Contact the PV Quality team for updates or withdrawn standards',
    'footer.copyright': '© {year} quality-Iqc · Solar IQC Standards Library',
    'footer.note': 'Always verify the controlled revision and release status before shop-floor use.',
    'home.badge': 'SOLAR PV IQC · ONLINE',
    'home.title1': 'Every PV',
    'home.titleHighlight': 'incoming lot',
    'home.title2': 'has a standard',
    'home.subtitle':
      'Manage inspection specifications, work instructions, sampling plans and forms for cells, glass, encapsulants, frames, junction boxes and ribbon materials in one place.',
    'home.hot': 'Popular searches',
    'home.search.1': 'Cell EL',
    'home.search.2': 'Glass transmittance',
    'home.search.3': 'EVA gel content',
    'home.search.4': 'Frame coating',
    'home.search.5': 'Junction box IP68',
    'home.trust.public': 'Public browsing, no login',
    'home.trust.coverage': '6 PV material categories',
    'home.trust.formats': 'DOCX / XLSX / PDF',
    'home.trust.version': 'Controlled revisions',
    'home.visual.controlled': 'PV IQC · CONTROLLED',
    'home.visual.controlledBadge': 'Controlled',
    'home.visual.fallbackNo': 'PV-IQC-WI-001',
    'home.visual.fallbackTitle': 'Mono Solar Cell Incoming Inspection Specification',
    'home.visual.fallbackCategory': 'Solar Cell Inspection',
    'home.visual.description': 'For PV incoming inspection. Verify the latest revision and effective date before use.',
    'home.visual.status': 'Status',
    'home.visual.statusValue': 'Released · Public',
    'home.visual.sampling': 'Sampling',
    'home.visual.updated': 'Updated',
    'home.visual.publisher': 'Released by PV Quality',
    'home.visual.recorded': 'Standards in library',
    'home.visual.latest': 'Updated {date}',
    'home.unit.docs': 'docs',
    'home.unit.groups': 'groups',
    'home.unit.downloads': 'downloads',
    'home.stats.documents': 'Standards',
    'home.stats.categories': 'PV material groups',
    'home.stats.downloads': 'Downloads',
    'home.stats.updated': 'Last updated',
    'home.categories.eyebrow': 'BROWSE BY PV MATERIAL',
    'home.categories.title': 'Browse by PV material',
    'home.categories.subtitle': 'Move from cells and glass to film, frames and junction boxes in one click.',
    'home.categories.all': 'All standards',
    'home.categories.error': 'Unable to load categories. Please refresh and try again.',
    'home.categories.open': 'Open category',
    'home.categories.count': '{count} standards',
    'home.recent.eyebrow': 'RECENTLY UPDATED',
    'home.recent.title': 'Recently updated',
    'home.recent.more': 'View more',
    'home.popular.eyebrow': 'MOST DOWNLOADED',
    'home.popular.title': 'Most downloaded',
    'home.popular.more': 'View download ranking',
    'home.popular.empty': 'No download data yet',
    'home.how.eyebrow': 'HOW IT WORKS',
    'home.how.title': 'Find an actionable PV inspection standard in three steps',
    'home.how.desc': 'Covers cells, glass, film, frames, junction boxes and ribbon materials. Upload, replace and withdraw actions are authenticated and audited.',
    'home.how.1.title': 'Locate the standard',
    'home.how.1.desc': 'Search by cell, glass, film or inspection item and narrow down by PV material.',
    'home.how.2.title': 'Check the requirements',
    'home.how.2.desc': 'Read visual, EL, dimensional and reliability criteria online, then confirm the revision and effective date.',
    'home.how.3.title': 'Download the controlled file',
    'home.how.3.desc': 'Use the controlled original for incoming inspection, supplier communication and training.',
    'home.cta.label': 'QUALITY STARTS HERE',
    'home.cta.title': 'Has the PV standard changed? Start from the latest revision.',
    'home.cta.desc': 'Confirm revision, effective date and release status before execution. Contact PV Quality if a cell, glass or film standard is missing or expired.',
    'home.cta.browse': 'Browse standards',
    'home.cta.login': 'Admin login',
    'docs.pagination': 'Pagination',
    'docs.eyebrow': 'PV STANDARD LIBRARY',
    'docs.title': 'PV standards library',
    'docs.subtitle': 'Search by keyword, PV material or document type across cells, glass, film, frames, junction boxes and ribbon materials.',
    'docs.count': '{count} standards',
    'docs.keyword': 'Keyword “{q}”',
    'docs.filter': 'Filters',
    'docs.sortLabel': 'Sort order',
    'docs.closeFilters': 'Close filters',
    'docs.sort.updated': 'Recently updated',
    'docs.sort.downloads': 'Most downloaded',
    'docs.sort.title': 'Title A–Z',
    'docs.category': 'PV materials',
    'docs.all': 'All categories',
    'docs.clear': 'Clear',
    'docs.docType': 'Document type',
    'docs.typeAll': 'All',
    'docs.resetAll': 'Reset all filters',
    'docs.current': 'Active filters',
    'docs.keywordFilter': 'Keyword: {q}',
    'docs.loading': 'Searching…',
    'docs.error': 'Unable to load standards',
    'docs.retry': 'Retry',
    'docs.emptyFiltered': 'No matching standards',
    'docs.emptyFilteredDesc': 'Try another keyword or reset the category and document type filters.',
    'docs.empty': 'The library is empty',
    'docs.emptyDesc': 'Published standards will appear here after an administrator uploads the first document.',
    'docs.reset': 'Clear filters',
    'docs.pager': '{total} items · page {page} of {pages}',
    'docs.prev': 'Previous page',
    'docs.next': 'Next page',
    'docs.page': 'Page {page}',
    'card.noSummary': 'No summary is available. Open the document to view the full content.',
    'card.download': 'Download {title}',
    'card.original': 'Download original',
    'detail.home': 'Home',
    'detail.library': 'Standards',
    'detail.published': 'Released',
    'detail.version': 'Revision {revision} · v{version}',
    'detail.updated': 'Updated {date}',
    'detail.copy': 'Copy link',
    'detail.copied': 'Copied',
    'detail.download': 'Download original',
    'detail.preview': 'Document preview',
    'detail.pages': '{count} pages',
    'detail.pages.one': '{count} page',
    'detail.pages.other': '{count} pages',
    'detail.sheets': '{count} worksheets',
    'detail.sheets.one': '{count} worksheet',
    'detail.sheets.other': '{count} worksheets',
    'detail.paragraphs': '{paragraphs} paragraphs / {tables} tables',
    'detail.images': '{count} images',
    'detail.images.one': '{count} image',
    'detail.images.other': '{count} images',
    'detail.downloadsValue': '{count} downloads',
    'detail.downloads.one': '{count} download',
    'detail.downloads.other': '{count} downloads',
    'detail.invalid': 'Invalid document ID',
    'detail.breadcrumb': 'Breadcrumb',
    'detail.relatedEyebrow': 'RELATED STANDARDS',
    'detail.autoParse': 'Auto-parsed',
    'detail.previewNote': 'The online preview is generated automatically and may differ from complex layouts. Use the controlled original for execution and disposition.',
    'detail.fileInfo': 'File information',
    'detail.docNo': 'Document no.',
    'detail.versionLabel': 'Revision / version',
    'detail.effective': 'Effective date',
    'detail.updatedLabel': 'Updated',
    'detail.downloads': 'Downloads',
    'detail.publisher': 'Publisher',
    'detail.fileSize': 'File size',
    'detail.productLine': 'Product line',
    'detail.supplier': 'Supplier',
    'detail.downloadControlled': 'Download controlled original',
    'detail.publicDownload': 'Public download',
    'detail.tags': 'Tags',
    'detail.usage': 'Usage note',
    'detail.summary': 'Summary',
    'detail.related': 'Related standards',
    'detail.more': 'View more',
    'detail.noRelated': 'No other published standards in this category',
    'detail.notFound': 'Unable to open this document',
    'detail.notFoundDesc': 'The document may have been withdrawn or deleted. Contact the PV Quality team.',
    'detail.back': 'Back to standards',
    'detail.linkCopied': 'Document link copied',
    'detail.copyFailed': 'Copy failed. Please copy the browser address manually.',
    'preview.empty': 'No readable content to preview',
    'preview.emptyDesc': 'Download the original file or ask an administrator to upload a readable document.',
    'preview.page': 'Page {page}',
    'preview.image': 'Embedded document image',
    'notfound.title': 'Page not found',
    'notfound.desc': 'The page does not exist or has moved. Return home or search the PV standards library.',
    'notfound.home': 'Back home',
    'notfound.search': 'Search standards',
    'doctype.inspection_spec': 'Inspection Specification',
    'doctype.work_instruction': 'Work Instruction',
    'doctype.sampling_plan': 'Sampling Plan',
    'doctype.form': 'Inspection Form',
    'doctype.supplier_standard': 'Supplier Standard',
    'doctype.equipment_sop': 'Equipment SOP',
    'doctype.other': 'Other',
    'common.notSet': 'Not set',
  },
}

function splitLocale(pathname: string): { locale: Locale; prefix: LocalePrefix } {
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    return { locale: 'en-US', prefix: 'en' }
  }
  return { locale: 'zh-CN', prefix: 'zh' }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { locale, prefix } = splitLocale(location.pathname)
  const [alternatePath, setAlternatePath] = useState<string | null>(null)

  useEffect(() => {
    const localizedPath =
      location.pathname === '/zh' ||
      location.pathname.startsWith('/zh/') ||
      location.pathname === '/en' ||
      location.pathname.startsWith('/en/')
    if (localizedPath) {
      localStorage.setItem('iqc_locale', locale)
      document.documentElement.lang = locale
    }
  }, [locale, location.pathname])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let text = messages[locale][key] ?? messages['zh-CN'][key] ?? key
      if (vars) {
        Object.entries(vars).forEach(([name, value]) => {
          text = text.replaceAll(`{${name}}`, String(value))
        })
      }
      return text
    },
    [locale],
  )

  const localePath = useCallback(
    (path: string) => {
      if (!path) return `/${prefix}`
      if (path.startsWith('http') || path.startsWith('mailto:') || path.startsWith('#')) return path
      if (path.startsWith('/login') || path.startsWith('/admin')) return path
      if (path === '/zh' || path.startsWith('/zh/') || path === '/en' || path.startsWith('/en/')) {
        return path
      }
      return path === '/' ? `/${prefix}` : `/${prefix}${path}`
    },
    [prefix],
  )

  useEffect(() => {
    if (!/\/documents\/\d+$/.test(location.pathname)) {
      setAlternatePath(null)
    }
  }, [location.pathname])

  const switchLocale = useCallback(
    (next: Locale) => {
      if (alternatePath) {
        navigate(alternatePath)
        return
      }
      const nextPrefix = next === 'en-US' ? 'en' : 'zh'
      const path = location.pathname
      let nextPath: string
      if (path === '/zh' || path.startsWith('/zh/') || path === '/en' || path.startsWith('/en/')) {
        nextPath = path.replace(/^\/(zh|en)/, `/${nextPrefix}`)
        if (/\/documents\/\d+$/.test(path)) {
          nextPath = `/${nextPrefix}/documents`
        }
      } else {
        nextPath = `/${nextPrefix}`
      }
      navigate({ pathname: nextPath, search: location.search })
    },
    [alternatePath, location.pathname, location.search, navigate],
  )

  const value = useMemo(
    () => ({ locale, prefix, t, localePath, switchLocale, setAlternatePath }),
    [locale, prefix, t, localePath, switchLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
