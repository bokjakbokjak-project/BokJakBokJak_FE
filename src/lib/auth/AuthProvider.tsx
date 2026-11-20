import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { onSessionEnd, refreshSession } from '../api/apiClient'
import { ApiError } from '../api/apiError'
import { isServerMode } from '../api/config'
import { loginAsGuest, loginWithGoogle, logout } from './authApi'
import type { SignInResult } from './authDto'
import { AuthContext, type AuthStatus } from './authState'
import { disableGoogleAutoSelect } from './googleIdentity'
import { hasSession } from './tokenStore'

const signInPending = () =>
  new ApiError({
    kind: 'http',
    status: null,
    code: 'SIGN_IN_PENDING',
    message: '로그인을 처리하고 있어요. 잠시만 기다려주세요.',
  })

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

  // One sign-in at a time, whichever screen started it (Google on `/`, 체험하기 on `/guest`). It
  // lives here, above the screens, so leaving and reopening a screen cannot start a second one
  // while the first is still out (two accounts, or one replacing the other).
  const signInPendingRef = useRef(false)
  const [isSigningIn, setIsSigningIn] = useState(false)

  // A new sign-in may be a different account (the login screen stays reachable while signed
  // in), so the screens start over without the previous answers.
  const startSignedIn = useCallback(
    async (login: () => Promise<SignInResult>) => {
      if (signInPendingRef.current) throw signInPending()
      signInPendingRef.current = true
      setIsSigningIn(true)
      try {
        const result = await login()
        setStatus('authenticated')
        setSessionId((id) => id + 1)
        return result
      } finally {
        signInPendingRef.current = false
        setIsSigningIn(false)
      }
    },
    [],
  )
  const signIn = useCallback(
    (idToken: string) => startSignedIn(() => loginWithGoogle(idToken)),
    [startSignedIn],
  )
  const signInAsGuest = useCallback(
    (nickname: string) => startSignedIn(() => loginAsGuest(nickname)),
    [startSignedIn],
  )

  const signOut = useCallback(async () => {
    const ended = await logout()
    // A newer sign-in happened while the request was out: it stays signed in.
    if (!ended) return false
    disableGoogleAutoSelect()
    finishSession()
    return true
  }, [finishSession])

  const value = useMemo(
    () => ({ status, sessionId, isSigningIn, signIn, signInAsGuest, signOut }),
    [status, sessionId, isSigningIn, signIn, signInAsGuest, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
