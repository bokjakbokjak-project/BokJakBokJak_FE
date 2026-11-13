import { createContext, useContext } from 'react'
import type { SignInResult } from './authDto'

/**
 * - `disabled`: sample mode (no VITE_API_MODE=server). Nothing is checked, as before.
 * - `restoring`: a session was found after a reload and is being checked with the server.
 * - `authenticated` / `unauthenticated`: server mode, known state.
 */
export type AuthStatus =
  'disabled' | 'restoring' | 'authenticated' | 'unauthenticated'

export type AuthContextValue = {
  status: AuthStatus
  /**
   * Changes when a session starts or ends (sign-in, sign-out, an invalid session), so the screens
   * below remount and nothing typed under another session stays in memory.
   */
  sessionId: number
  signIn: (idToken: string) => Promise<SignInResult>
  /** Resolves false when another account signed in before the logout finished. */
  signOut: () => Promise<boolean>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
