import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  AUTH_EXPIRED_EVENT,
  USER_KEY,
  api,
  clearAuth,
  setAuth,
} from '../api/client'
import type { User } from '../api/types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const token = localStorage.getItem('iqc_insp_token')
    if (!token) {
      setLoading(false)
      return
    }
    api
      .me()
      .then((profile) => {
        if (active) {
          setUser(profile)
          localStorage.setItem(USER_KEY, JSON.stringify(profile))
        }
      })
      .catch(() => {
        if (active) {
          clearAuth()
          setUser(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleExpired = () => setUser(null)
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const response = await api.login(username, password)
    setAuth(response.access_token, response.user)
    setUser(response.user)
    return response.user
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
