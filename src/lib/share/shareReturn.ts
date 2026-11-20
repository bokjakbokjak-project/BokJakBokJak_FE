/**
 * The shared profile a visitor left to sign in or to take the survey (requested 2026-11-20).
 * Kept in sessionStorage, so it survives Google's sign-in and the onboarding and survey of this
 * tab, and is brought back once:
 *
 * - right after a sign-in whose user already has a survey (useStartRouteRedirect), or
 * - right after the survey is saved (QuestionLoadingPage), in place of the survey result.
 *
 * Only a share link is accepted, so nothing else can be injected here.
 */
const KEY = 'bokjak-share-return'

export function rememberShareReturn(hash: string) {
  try {
    sessionStorage.setItem(KEY, `/share${hash}`)
  } catch {
    /* Storage may be unavailable. */
  }
}

function read(): string | null {
  try {
    const value = sessionStorage.getItem(KEY)
    return value?.startsWith('/share#') ? value : null
  } catch {
    return null
  }
}

/** The kept link, once. */
export function takeShareReturn(): string | null {
  const value = read()
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* Storage may be unavailable. */
  }
  return value
}
