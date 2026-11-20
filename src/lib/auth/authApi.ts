import { apiRequest } from '../api/apiClient'
import { parseLoginResponse, type SignInResult } from './authDto'
import { rememberSignInStep } from './startRoute'
import {
  clearTokens,
  getRefreshToken,
  getSessionGeneration,
  hasSession,
  startSession,
} from './tokenStore'

/** Starts a session from a login answer. Saves the tokens only after a valid answer. */
async function signInWith(path: string, body: unknown): Promise<SignInResult> {
  const data = await apiRequest(path, { method: 'POST', auth: false, body })
  const { tokens, result } = parseLoginResponse(data)
  startSession(tokens)
  // Kept for the new session before any screen reacts to it (startRoute.ts).
  rememberSignInStep(result.nextStep)
  return result
}

/** POST /api/auth/login with the Google ID token. */
export function loginWithGoogle(idToken: string): Promise<SignInResult> {
  return signInWith('/api/auth/login', { id_token: idToken })
}

/**
 * POST /api/auth/guest-login (BE PR #84): 체험하기 for judges and demo visitors. Each call creates a
 * new test account with only this name (the server fills school, dormitory and gender so that
 * the account meets the personas as candidates). The answer is the Google login's answer, with
 * `next_step` SURVEY. The server can switch it off (404).
 */
export function loginAsGuest(nickname: string): Promise<SignInResult> {
  return signInWith('/api/auth/guest-login', { nickname })
}

/**
 * POST /api/auth/logout. The spec says to clear the local session whatever the answer, so this
 * never rejects: a failed request only means the server-side tokens expire on their own.
 *
 * It ends only the session it started in. Resolves false if another account signed in while the
 * request was out: that newer session is left alone and the caller must not act on it.
 */
export async function logout(): Promise<boolean> {
  const generation = getSessionGeneration()
  if (getRefreshToken()) {
    try {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
        // Read at send time: a refresh before the retry replaces the refresh token.
        body: () => ({ refresh_token: getRefreshToken() }),
      })
    } catch {
      // Signed out locally below either way.
    }
  }
  if (getSessionGeneration() === generation) {
    clearTokens()
    return true
  }
  // Already ended meanwhile (a refused refresh) unless a newer sign-in holds tokens now.
  return !hasSession()
}
