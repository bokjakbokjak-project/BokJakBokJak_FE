import type { OnboardingData } from '../onboarding/onboardingState'
import { getTestProfileConfig, isUserTestEnabled, testerName } from './config'
import { getParticipantId } from './userTestStore'

/**
 * The onboarding answers the user test fills in by itself: the anonymous name and the shared
 * test values, in place of the school, profile and dormitory steps. The priorities and the
 * survey stay the tester's own. Null outside the user test, before sign-in, or while the test
 * values are not set.
 *
 * The existing API saves this together with the priorities (PUT /api/me/onboarding), so the
 * basic information reaches the server when the tester finishes the priority step; it is not a
 * separate registration.
 */
export function testOnboardingPatch(): Partial<OnboardingData> | null {
  if (!isUserTestEnabled()) return null
  const participant = getParticipantId()
  const config = getTestProfileConfig()
  if (participant === null || config.status !== 'ready') return null
  const { values } = config
  return {
    name: testerName(participant),
    department: values.department,
    studentId: values.studentNumber,
    gender: values.gender,
    birthYear: values.birthYear,
    dormitory: values.dormitory,
    roomCapacity: 2,
    selectedDormitory: null,
  }
}
