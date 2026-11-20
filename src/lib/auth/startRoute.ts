import type { NextStep } from './authDto'
import { routeForNextStep } from './nextStep'
import { fetchMyStatus } from './statusApi'
import { getSessionGeneration } from './tokenStore'

/**
 * Where a signed-in user goes from the first screen (`/`): when the app starts with a stored
 * session, and right after a sign-in. GET /api/me/status decides, so a user who has to answer the
 * survey again lands on the survey (its `next_step` is SURVEY then) and sees why there.
 *
 * Until the backend serves that API (BE PR #72 is on dev, not yet deployed), or when it fails,
 * a fresh sign-in still follows the `next_step` of its login answer and a restored session stays
 * on the first screen, as before. A sign-in remounts the screens (SessionBoundary), so the login
 * answer is kept here, tied to its session, instead of in the screen.
 */

let signInStep: { generation: number; step: NextStep } | null = null
let inFlight: { generation: number; promise: Promise<string | null> } | null =
  null

/** Called right after a successful sign-in with the `next_step` of the login answer. */
export function rememberSignInStep(step: NextStep) {
  signInStep = { generation: getSessionGeneration(), step }
}

async function resolve(generation: number) {
  // The login answer stands in only for the read right after that sign-in. A later visit to the
  // first screen must not follow an old answer (such as ONBOARDING after the onboarding is done).
  const fallback =
    signInStep?.generation === generation ? signInStep.step : null
  signInStep = null
  try {
    const status = await fetchMyStatus()
    if (getSessionGeneration() !== generation) return null
    return routeForNextStep(status.nextStep)
  } catch {
    if (getSessionGeneration() !== generation) return null
    return fallback ? routeForNextStep(fallback) : null
  }
}

/**
 * The screen to open for this session, or null to stay on the first screen. Callers of the same
 * session share one request (StrictMode runs the effect twice).
 */
export function resolveStartRoute(): Promise<string | null> {
  const generation = getSessionGeneration()
  if (inFlight?.generation !== generation) {
    const promise = resolve(generation).finally(() => {
      if (inFlight?.promise === promise) inFlight = null
    })
    inFlight = { generation, promise }
  }
  return inFlight.promise
}

export function resetStartRouteForTests() {
  signInStep = null
  inFlight = null
}
