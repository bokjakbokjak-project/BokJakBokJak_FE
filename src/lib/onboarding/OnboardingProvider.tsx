import { useCallback, useMemo, useState } from 'react'
import { Outlet } from 'react-router'
import {
  INITIAL_ONBOARDING_DATA,
  OnboardingContext,
  type OnboardingData,
} from './onboardingState'

/**
 * Keeps answers in memory across every screen of a session, so it stays mounted above the home
 * and roommate routes. Nothing is sent to a server yet.
 */
export default function OnboardingProvider() {
  const [data, setData] = useState(INITIAL_ONBOARDING_DATA)
  const [hasSeenMission, setHasSeenMission] = useState(false)
  const update = useCallback((patch: Partial<OnboardingData>) => {
    setData((current) => ({ ...current, ...patch }))
  }, [])
  const markMissionSeen = useCallback(() => setHasSeenMission(true), [])
  const value = useMemo(
    () => ({ data, update, hasSeenMission, markMissionSeen }),
    [data, update, hasSeenMission, markMissionSeen],
  )

  return (
    <OnboardingContext.Provider value={value}>
      <Outlet />
    </OnboardingContext.Provider>
  )
}
