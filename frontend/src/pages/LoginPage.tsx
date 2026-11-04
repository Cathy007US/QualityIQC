import {
  AlertCircle,
  ArrowLeft,
  BookOpenCheck,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UploadCloud,
  UserRound,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Logo } from '../components/Logo'

const features = [
  {
    icon: UploadCloud,
    title: '光伏标准集中维护',
    text: '电池片 EL、玻璃透光率、胶膜交联度等标准统一归档。',
  },
  { icon: BookOpenCheck, title: '版本受控可追溯', text: '保留历史版本，替换文件后自动生成新版本记录。' },
  { icon: ShieldCheck, title: '操作权限隔离', text: '浏览公开，上传与管理仅限登录管理员。' },
]

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = '管理登录 · quality-Iqc'
  }, [])

  const from = (location.state as { from?: string } | null)?.from
  const redirectTo = from && from.startsWith('/') ? from : '/admin'

  if (!loading && user) {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await login(username.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-[#f5f6f3] lg:grid-cols-[1.04fr_0.96fr]">
      <aside className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-30" />
        <div className="pointer-events-none absolute -right-32 top-1/4 h-80 w-80 rounded-full border-[42px] border-brand-400/10" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-brand-400/10 blur-3xl" />

        <div className="relative">
          <Logo light />
        </div>

        <div className="relative my-auto max-w-lg py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Quality Control Workspace
          </div>
          <h1 className="mt-6 text-balance text-[40px] font-black leading-[1.2] tracking-tight">
            把光伏来料标准
            <br />
            放在人人都能找到的地方
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-brand-100/55">
            统一沉淀电池片、光伏玻璃、封装胶膜、铝边框、接线盒与焊带辅材的检验要求，
            减少口头传递与版本错用。
          </p>

          <div className="mt-10 space-y-5">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="flex gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-brand-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{feature.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-brand-100/45">{feature.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative flex items-center justify-between border-t border-white/10 pt-5 text-[10px] text-brand-200/35">
          <span>quality-Iqc · SOLAR PV INSPECTION</span>
          <span>v1.1</span>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-10 sm:py-8">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition hover:text-brand-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回标准库
          </Link>
        </div>

        <div className="my-auto flex justify-center py-10">
          <div className="w-full max-w-[380px]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-900 text-brand-100 shadow-sm">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <h2 className="mt-5 text-[26px] font-black tracking-tight text-ink-950">管理员登录</h2>
            <p className="mt-2 text-xs leading-6 text-ink-500">
              登录后可上传、替换、编辑和下架标准文档。普通浏览无需登录。
            </p>

            {error && (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-700 animate-fade-in">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="username" className="label">
                  用户名
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="请输入管理员用户名"
                    className="input pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="label">
                  密码
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="请输入登录密码"
                    className="input px-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-600"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                {submitting ? '正在登录…' : '登录管理后台'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-ink-400">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
              JWT 安全认证 · 连续失败将临时限制登录
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-ink-400">
          © {new Date().getFullYear()} quality-Iqc · 太阳能 IQC 检验标准知识库
        </p>
      </main>
    </div>
  )
}
