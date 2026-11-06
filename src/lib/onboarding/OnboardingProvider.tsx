import { useCallback, useMemo, useState } from 'react'
import { Outlet } from 'react-router'
import {
  INITIAL_ONBOARDING_DATA,
  OnboardingContext,
  type OnboardingData,
} from './onboardingState'

/** Keeps answers in memory across steps. Nothing is sent to a server yet. */
export default function OnboardingProvider() {
  const [data, setData] = useState(INITIAL_ONBOARDING_DATA)
  const update = useCallback((patch: Partial<OnboardingData>) => {
    setData((current) => ({ ...current, ...patch }))
  }, [])
  const value = useMemo(() => ({ data, update }), [data, update])

  return (
    <OnboardingContext.Provider value={value}>
      <Outlet />
    </OnboardingContext.Provider>
  )
}
