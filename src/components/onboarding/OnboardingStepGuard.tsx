import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { isServerMode } from '../../lib/api/config'
import {
  getRequiredStepRoute,
  savedAnswersKey,
  useOnboarding,
  type GuardedRoute,
} from '../../lib/onboarding/onboardingState'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'

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
 * an address typed by hand cannot skip the save on the way to the survey.
 */
export default function OnboardingStepGuard({
  route,
  children,
}: OnboardingStepGuardProps) {
  const { data, savedAnswersKey: savedKey } = useOnboarding()
  const requiredRoute =
    getRequiredStepRoute(data, route) ??
    (route === ONBOARDING_ROUTES.complete &&
    isServerMode() &&
    savedKey !== savedAnswersKey(data)
      ? ONBOARDING_ROUTES.priority
      : null)

  return requiredRoute ? <Navigate to={requiredRoute} replace /> : children
}
