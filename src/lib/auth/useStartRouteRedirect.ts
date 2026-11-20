import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from './authState'
import { resolveStartRoute } from './startRoute'

/**
 * For the screens before sign-in (`/` and the 체험하기 name screen): a signed-in user does not stay
 * there. GET /api/me/status picks the screen (startRoute.ts), both when the app starts with a
 * stored session and right after a sign-in, which remounts the screen with the new session.
 * Without an answer a restored session stays, as before.
 *
 * Returns true while that is being decided, so nothing on the screen can start another sign-in.
 */
export function useStartRouteRedirect() {
  const navigate = useNavigate()
  const { status } = useAuth()
  const [stayHere, setStayHere] = useState(false)
  const isResolving =
    status === 'restoring' || (status === 'authenticated' && !stayHere)

  useEffect(() => {
    if (status !== 'authenticated') return
    let isCurrent = true
    resolveStartRoute().then((route) => {
      if (!isCurrent) return
      if (route) navigate(route, { replace: true })
      else setStayHere(true)
    })
    return () => {
      isCurrent = false
    }
  }, [status, navigate])

  return isResolving
}
