import type { SignInResult } from '../auth/authDto'
import { isUserTestEnabled } from './config'
import { startParticipant } from './userTestStore'
import { USER_TEST_ROUTES } from './routes'

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
