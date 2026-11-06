import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import {
  getRequiredStepRoute,
  useOnboarding,
  type GuardedRoute,
} from '../../lib/onboarding/onboardingState'

type OnboardingStepGuardProps = {
  route: GuardedRoute
  children: ReactNode
}

/**
 * Sends the user to the earliest step with missing answers. It only checks onboarding input
 * and is separate from authentication, which is not decided yet (OPEN_QUESTIONS BE-1, BE-3).
 * The target's earlier steps are all complete, so a redirect cannot loop.
 */
export default function OnboardingStepGuard({
  route,
  children,
}: OnboardingStepGuardProps) {
  const { data } = useOnboarding()
  const requiredRoute = getRequiredStepRoute(data, route)

  return requiredRoute ? <Navigate to={requiredRoute} replace /> : children
}
