import { useCallback, useMemo, useState } from 'react'
import { Outlet } from 'react-router'
import {
  INITIAL_ONBOARDING_DATA,
  OnboardingContext,
  type OnboardingData,
} from './onboardingState'

/**
 * Keeps answers in memory across steps. Nothing is sent to a server yet. It also paints the
 * onboarding background, reaching into the safe area so no other color shows around it.
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
      <div className="-mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex flex-1 flex-col overflow-x-clip bg-brand-cream1 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:overflow-hidden md:rounded-[24px]">
        <Outlet />
      </div>
    </OnboardingContext.Provider>
  )
}
