import type { SignInResult } from '../auth/authDto'
import { isUserTestEnabled } from './config'
import { startParticipant } from './userTestStore'
import { USER_TEST_ROUTES } from './routes'
import { HOME_ROUTES } from '../home/routes'

/**
 * After a sign-in in the user test build: records the tester and opens the test start screen
 * instead of the onboarding. A tester whose survey is already saved goes where the server says
 * (the home). Null outside the user test, so the normal routing applies.
 *
 * The sign-in itself stays the existing Google login: the shared basic information never
 * replaces the school account check, which the server does.
 */
export function userTestRouteAfterSignIn(result: SignInResult): string | null {
  if (!isUserTestEnabled()) return null
  startParticipant(result.userId, {
    onboardingCompleted: result.onboardingCompleted,
    surveyCompleted: result.surveyCompleted,
  })
  return result.nextStep === 'HOME' ? null : USER_TEST_ROUTES.start
}

/**
 * The login now picks the screen from GET /api/me/status (startRoute.ts). In the user test a
 * tester who still has to take the survey goes to the test start screen instead; the home and
 * staying on the login are kept.
 */
export function userTestStartRoute(route: string | null): string | null {
  if (!isUserTestEnabled() || route === null || route === HOME_ROUTES.home) {
    return route
  }
  return USER_TEST_ROUTES.start
}
