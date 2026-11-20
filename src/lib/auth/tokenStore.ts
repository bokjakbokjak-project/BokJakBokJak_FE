/**
 * Where the sign-in tokens live.
 *
 * The backend returns both tokens in the response body (no cookie), so the frontend has to keep
 * them somewhere script can read. To limit what a script injected into the page could take:
 * - The access token (30 minutes) stays in memory only and is never written to storage.
 * - The refresh token (14 days) is shared through localStorage between tabs of the same origin.
 * If storage is blocked, the refresh token stays in memory and the session ends with the page.
 *
 * Never log these values.
 */

export const REFRESH_TOKEN_KEY = 'bokjak-auth-refresh'
export const SESSION_MARKER_KEY = 'bokjak-auth-session'

export type TokenPair = {
  accessToken: string
  refreshToken: string
}

let accessToken: string | null = null
let memoryRefreshToken: string | null = null
let memoryOnly = false
/**
 * Changes when a session starts (sign-in) or ends (clear), but not when a refresh rotates the
 * tokens of the same session. Work started under one session checks it before touching tokens
 * or retrying, so it can never act on, or clear, someone else's session.
 */
let sessionGeneration = 0

export function getSessionGeneration() {
  return sessionGeneration
}

export function getAccessToken() {
  return accessToken
}

export function getRefreshToken(): string | null {
  if (memoryOnly) return memoryRefreshToken
  try {
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (stored) {
      sessionStorage.removeItem(REFRESH_TOKEN_KEY)
      return stored
    }
    // Upgrade an existing tab once; do not leave the old token able to restore a logged-out tab.
    const legacy = sessionStorage.getItem(REFRESH_TOKEN_KEY)
    if (legacy) {
      localStorage.setItem(REFRESH_TOKEN_KEY, legacy)
      sessionStorage.removeItem(REFRESH_TOKEN_KEY)
      return legacy
    }
    return null
  } catch {
    return memoryRefreshToken
  }
}

export function hasSession() {
  return getRefreshToken() !== null
}

/** A sign-in: a new session, even if another one was active. */
export function startSession(tokens: TokenPair) {
  sessionGeneration += 1
  saveTokens(tokens)
  try {
    if (!memoryOnly) {
      localStorage.setItem(SESSION_MARKER_KEY, crypto.randomUUID())
    }
  } catch {
    // A missing marker does not prevent signing in.
  }
}

/** Discard this tab's session without deleting another tab's newly signed-in account. */
export function forgetLocalSession() {
  sessionGeneration += 1
  accessToken = null
  memoryRefreshToken = null
  memoryOnly = false
  try {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // Storage is unavailable.
  }
}

/** A refresh: the same session with rotated tokens. */
export function saveTokens(tokens: TokenPair) {
  accessToken = tokens.accessToken
  memoryRefreshToken = tokens.refreshToken
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
    memoryOnly = false
  } catch {
    // Kept in memory only. The session then ends with the page.
    memoryOnly = true
  }
}

const clearListeners = new Set<() => void>()

/**
 * Runs when the session ends (sign-out, a refused refresh, another sign-in), so data kept for
 * the signed-in user, such as the user test participant, goes with the tokens.
 */
export function onTokensCleared(listener: () => void) {
  clearListeners.add(listener)
  return () => {
    clearListeners.delete(listener)
  }
}

export function clearTokens() {
  sessionGeneration += 1
  accessToken = null
  memoryRefreshToken = null
  memoryOnly = false
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(SESSION_MARKER_KEY)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // Nothing was stored.
  }
  for (const listener of clearListeners) listener()
}
