/**
 * Where the sign-in tokens live.
 *
 * The backend returns both tokens in the response body (no cookie), so the frontend has to keep
 * them somewhere script can read. To limit what a script injected into the page could take:
 * - The access token (30 minutes) stays in memory only and is never written to storage.
 * - The refresh token (14 days) goes to sessionStorage, not localStorage. It survives a reload
 *   of the tab, which is how the session comes back, but it is gone when the tab closes, and other
 *   tabs never see it, so two tabs cannot race each other on the one-time refresh token.
 * If storage is blocked, the refresh token stays in memory and the session ends with the page.
 *
 * Never log these values.
 */

const REFRESH_TOKEN_KEY = 'bokjak-auth-refresh'

export type TokenPair = {
  accessToken: string
  refreshToken: string
}

let accessToken: string | null = null
let memoryRefreshToken: string | null = null
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
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? memoryRefreshToken
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
}

/** A refresh: the same session with rotated tokens. */
export function saveTokens(tokens: TokenPair) {
  accessToken = tokens.accessToken
  memoryRefreshToken = tokens.refreshToken
  try {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  } catch {
    // Kept in memory only. The session then ends with the page.
  }
}

export function clearTokens() {
  sessionGeneration += 1
  accessToken = null
  memoryRefreshToken = null
  try {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // Nothing was stored.
  }
}
