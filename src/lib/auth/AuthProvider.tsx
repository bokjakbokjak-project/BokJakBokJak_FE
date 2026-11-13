import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onSessionEnd, refreshSession } from '../api/apiClient'
import { isServerMode } from '../api/config'
import { loginWithGoogle, logout } from './authApi'
import { AuthContext, type AuthStatus } from './authState'
import { disableGoogleAutoSelect } from './googleIdentity'
import { hasSession } from './tokenStore'

function initialStatus(): AuthStatus {
  if (!isServerMode()) return 'disabled'
  return hasSession() ? 'restoring' : 'unauthenticated'
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState(initialStatus)
  const [sessionId, setSessionId] = useState(0)

  const finishSession = useCallback(() => {
    setStatus('unauthenticated')
    setSessionId((id) => id + 1)
  }, [])

  // The access token lives in memory only, so a reload checks the stored refresh token once.
  useEffect(() => {
    if (status !== 'restoring') return
    let isCurrent = true
    refreshSession().then(
      () => {
        if (isCurrent) setStatus('authenticated')
      },
      () => {
        // Unproven sessions never open protected screens. A refused token was already cleared;
        // after a network or server failure the token stays, so a reload can try again, but the
        // user goes to the login screen until then.
        if (isCurrent) setStatus('unauthenticated')
      },
    )
    return () => {
      isCurrent = false
    }
  }, [status])

  useEffect(() => {
    if (status === 'disabled') return
    return onSessionEnd(finishSession)
  }, [status, finishSession])

  const signIn = useCallback(async (idToken: string) => {
    const result = await loginWithGoogle(idToken)
    setStatus('authenticated')
    // A new sign-in may be a different account (the login screen stays reachable while signed
    // in), so the screens start over without the previous answers.
    setSessionId((id) => id + 1)
    return result
  }, [])

  const signOut = useCallback(async () => {
    const ended = await logout()
    // A newer sign-in happened while the request was out: it stays signed in.
    if (!ended) return false
    disableGoogleAutoSelect()
    finishSession()
    return true
  }, [finishSession])

  const value = useMemo(
    () => ({ status, sessionId, signIn, signOut }),
    [status, sessionId, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
