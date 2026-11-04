import type { ComponentProps } from 'react'
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  useNavigate,
  type NavigateOptions,
  type To,
} from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'

type LinkProps = ComponentProps<typeof RouterLink>
type NavLinkProps = ComponentProps<typeof RouterNavLink>

function prefixTo(to: To, localePath: (path: string) => string): To {
  if (typeof to === 'string') return localePath(to)
  return {
    ...to,
    pathname: localePath(to.pathname ?? '/'),
  }
}

export function Link({ to, ...props }: LinkProps) {
  const { localePath } = useI18n()
  return <RouterLink {...props} to={prefixTo(to, localePath)} />
}

export function NavLink({ to, ...props }: NavLinkProps) {
  const { localePath } = useI18n()
  return <RouterNavLink {...props} to={prefixTo(to, localePath)} />
}

export function useLocaleNavigate() {
  const navigate = useNavigate()
  const { localePath } = useI18n()
  return (to: To, options?: NavigateOptions) => navigate(prefixTo(to, localePath), options)
}
