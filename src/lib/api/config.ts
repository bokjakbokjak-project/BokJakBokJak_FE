/**
 * Which backend the app talks to. The server flow is opt-in with `VITE_API_MODE=server`, so a
 * build without that flag keeps the existing in-memory sample flow (the dormitory, chat, and
 * roommate samples), and the two never mix. Values are read on each call so tests can stub them.
 */
export type ApiMode = 'server' | 'mock'

export function getApiMode(): ApiMode {
  return import.meta.env.VITE_API_MODE === 'server' ? 'server' : 'mock'
}

export function isServerMode() {
  return getApiMode() === 'server'
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

/**
 * The backend origin without a trailing slash, or null when it is missing or unsafe. Tokens are
 * sent to it, so plain http is refused except for a server on this machine.
 */
export function getApiBaseUrl(): string | null {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim()
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  const isSecure =
    url.protocol === 'https:' ||
    (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))
  if (!isSecure || url.search || url.hash || url.username || url.password) {
    return null
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
}

export function getGoogleClientId(): string | null {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || null
}
