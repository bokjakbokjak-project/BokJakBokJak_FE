import { useCallback, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import {
  INITIAL_ONBOARDING_DATA,
  OnboardingContext,
  type OnboardingData,
} from './onboardingState'

/**
 * Keeps answers in memory across every screen of a session, so it stays mounted above the home
 * and roommate routes. In server mode the priority step saves them in one request
 * (PUT /api/me/onboarding); in sample mode nothing is sent.
 */
export default function OnboardingProvider() {
  const [data, setData] = useState(INITIAL_ONBOARDING_DATA)
  const [hasSeenMission, setHasSeenMission] = useState(false)
  const [savedAnswersKey, setSavedAnswersKey] = useState<string | null>(null)
  // Lives here, not in the screen, so leaving and reopening the priority step while a save is
  // out cannot start a second save that could reach the server in the other order.
  const isSavingRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const update = useCallback((patch: Partial<OnboardingData>) => {
    setData((current) => ({ ...current, ...patch }))
  }, [])
  const markMissionSeen = useCallback(() => setHasSeenMission(true), [])
  const beginSave = useCallback(() => {
    if (isSavingRef.current) return false
    isSavingRef.current = true
    setIsSaving(true)
    return true
  }, [])
  const endSave = useCallback(() => {
    isSavingRef.current = false
    setIsSaving(false)
  }, [])
  const value = useMemo(
    () => ({
      data,
      update,
      hasSeenMission,
      markMissionSeen,
      savedAnswersKey,
      markSaved: setSavedAnswersKey,
      isSaving,
      beginSave,
      endSave,
    }),
    [
      data,
      update,
      hasSeenMission,
      markMissionSeen,
      savedAnswersKey,
      isSaving,
      beginSave,
      endSave,
    ],
  )

  return (
    <OnboardingContext.Provider value={value}>
      <Outlet />
    </OnboardingContext.Provider>
  )
}
