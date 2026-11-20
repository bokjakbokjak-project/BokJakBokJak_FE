import { SHARE_ROUTE } from './profileShare'

/**
 * `복작복작으로 이동` on a shared profile sends a signed-out visitor to the login, and the login
 * brings them back to that same link to finish what they asked for (requested 2026-11-20). The
 * link is kept in sessionStorage, so it survives Google's sign-in but not a new tab.
 */
const KEY = 'bokjak-share-return'

/** What the shared profile reads from the navigation state when the login brings it back. */
export type SharedReturnState = {
  continueShared: true
  /** Where the login would have gone (GET /api/me/status), so a new user starts from the onboarding. */
  startRoute: string | null
}

export function rememberShareReturn(pathWithHash: string) {
  try {
    sessionStorage.setItem(KEY, pathWithHash)
  } catch {
    // Without storage the login goes on as usual, to the screen its `next_step` names.
  }
}

/** The kept link, once. Only a share link is accepted, so nothing else can be injected here. */
export function takeShareReturn(): string | null {
  try {
    const path = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return path && path.startsWith(`${SHARE_ROUTE}#`) ? path : null
  } catch {
    return null
  }
}

export function isSharedReturnState(
  value: unknown,
): value is SharedReturnState {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { continueShared?: unknown }).continueShared === true
  )
}
