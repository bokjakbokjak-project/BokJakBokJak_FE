/**
 * 핵심 체험 | 전체 서비스 (2026-11-20 요청, `복작복작_체험용_전체서비스_Claude_구현요청.md`).
 *
 * `VITE_API_MODE` stays the deployment's connection setting. The experience mode is a separate
 * runtime choice kept in this browser, and only builds with `VITE_EXPERIENCE=true` offer it, so
 * the production build is unchanged.
 *
 * - `service`: the app as deployed (the real Google sign-in and server in server mode).
 * - `experience`: the in-memory sample flow with no sign-in and no request to the server, plus
 *   the scripted experience chat. Every result in it is an example and says so.
 *
 * A switch reloads the page on the other mode's start screen. That one step stops every request
 * in flight, the chat polling and any scheduled reply, and drops every memory state and cache,
 * so nothing of one mode reaches the other.
 */
export type AppMode = 'experience' | 'service'

const MODE_KEY = 'bokjak-app-mode'

export const EXPERIENCE_ROUTES = {
  /** The experience link (booth QR): opens the experience mode at its start screen. */
  start: '/experience',
  /** The service link (judges): opens the service mode at the login. */
  service: '/service',
  chat: '/experience/chat',
} as const

export function isExperienceEnabled() {
  return import.meta.env.VITE_EXPERIENCE === 'true'
}

function readMode(): AppMode | null {
  try {
    const value = localStorage.getItem(MODE_KEY)
    return value === 'experience' || value === 'service' ? value : null
  } catch {
    return null
  }
}

/** The service mode unless this build offers the experience and it was chosen. */
export function getAppMode(): AppMode {
  if (!isExperienceEnabled()) return 'service'
  return readMode() ?? 'service'
}

export function isExperienceMode() {
  return getAppMode() === 'experience'
}

export function setAppMode(mode: AppMode) {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    // Without storage the mode cannot be kept, and the build stays on the service mode.
  }
}

/** The start screen of each mode. */
export function startRouteOf(mode: AppMode) {
  return mode === 'experience' ? EXPERIENCE_ROUTES.start : '/'
}

/** Switches the mode and reloads on its start screen (see above). */
export function switchAppMode(mode: AppMode) {
  setAppMode(mode)
  window.location.replace(startRouteOf(mode))
}
