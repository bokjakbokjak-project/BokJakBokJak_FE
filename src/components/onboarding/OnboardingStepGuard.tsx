import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { isServerMode } from '../../lib/api/config'
import {
  getRequiredStepRoute,
  isPriorityStepComplete,
  savedAnswersKey,
  useOnboarding,
  type GuardedRoute,
  type OnboardingData,
} from '../../lib/onboarding/onboardingState'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { useQuestion } from '../../pages/question/questionState'

/**
 * 마이페이지 「설문조사 다시 하기」 needs only the priorities: the other answers were saved in
 * the onboarding, and a new session no longer holds them in memory.
 */
function requiredRouteForRetake(data: OnboardingData, route: GuardedRoute) {
  if (route === ONBOARDING_ROUTES.priority) return null
  if (route === ONBOARDING_ROUTES.complete) {
    return isPriorityStepComplete(data) ? null : ONBOARDING_ROUTES.priority
  }
  return null
}

type OnboardingStepGuardProps = {
  route: GuardedRoute
  children: ReactNode
}

/**
 * Sends the user to the earliest step with missing answers. It only checks onboarding input
 * and is separate from authentication, which is not decided yet (OPEN_QUESTIONS BE-1, BE-3).
 * The target's earlier steps are all complete, so a redirect cannot loop.
 *
 * In server mode the complete screen also needs the answers on screen to be the saved ones, so
 * an address typed by hand cannot skip the save on the way to the survey. A retake saves its
 * priorities with the survey instead, so it skips that check.
 */
export default function OnboardingStepGuard({
  route,
  children,
}: OnboardingStepGuardProps) {
  const { data, savedAnswersKey: savedKey } = useOnboarding()
  const { isRetake } = useQuestion()
  const requiredRoute = isRetake
    ? requiredRouteForRetake(data, route)
    : (getRequiredStepRoute(data, route) ??
      (route === ONBOARDING_ROUTES.complete &&
      isServerMode() &&
      savedKey !== savedAnswersKey(data)
        ? ONBOARDING_ROUTES.priority
        : null))

  return requiredRoute ? <Navigate to={requiredRoute} replace /> : children
}
