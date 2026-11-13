import { apiRequest } from '../api/apiClient'
import { parseLoginResponse, type SignInResult } from './authDto'
import {
  clearTokens,
  getRefreshToken,
  getSessionGeneration,
  hasSession,
  startSession,
} from './tokenStore'

/** POST /api/auth/login with the Google ID token. Saves the tokens only after a valid answer. */
export async function loginWithGoogle(idToken: string): Promise<SignInResult> {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { id_token: idToken },
  })
  const { tokens, result } = parseLoginResponse(data)
  startSession(tokens)
  return result
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
