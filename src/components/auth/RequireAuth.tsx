import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../../lib/auth/authState'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'

/**
 * Lets the screens below open only with a session, in server mode. In sample mode it lets
 * everything through, as before. While a reload checks the session it shows nothing, so a
 * protected screen never flashes for a session that turns out to be invalid.
 */
export default function RequireAuth() {
  const { status } = useAuth()
  if (status === 'disabled' || status === 'authenticated') return <Outlet />
  if (status === 'restoring') {
    return <div role="status" aria-label="로그인 상태를 확인하고 있어요" />
  }
  return <Navigate to={ONBOARDING_ROUTES.login} replace />
}
