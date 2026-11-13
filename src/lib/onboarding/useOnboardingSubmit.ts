import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/apiError'
import { isServerMode } from '../api/config'
import { getSessionGeneration } from '../auth/tokenStore'
import { getDormitoryApi } from './dormitoryApi'
import {
  buildOnboardingRequest,
  describeSubmitError,
  getConfirmedRoomType,
  isRoomTypeRejected,
  resolveRoomType,
  saveOnboarding,
} from './onboardingApi'
import { savedAnswersKey, useOnboarding } from './onboardingState'

export type SubmitState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'failed'; message: string }

/**
 * The priority step's 「완료하기」. In server mode it finds or registers the room type, then
 * saves every answer with PUT /api/me/onboarding, and calls `onSaved` only after the server
 * confirms. A failure keeps every answer, and the next press tries again. Sample mode saves
 * nothing and moves on, as before.
 *
 * One save runs at a time per session: the lock lives in OnboardingProvider, so a screen opened
 * again while a save is out waits for it instead of sending another. A save that finishes after
 * its screen closed still records what it sent; the complete screen opens only if that is still
 * what is on screen. A 401 is handled by the shared client: it refreshes and retries, or ends the
 * session, which remounts these screens and the provider and drops the result.
 */
export function useOnboardingSubmit(onSaved: () => void) {
  const {
    data,
    update,
    savedAnswersKey: savedKey,
    markSaved,
    isSaving,
    beginSave,
    endSave,
  } = useOnboarding()
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const submit = async () => {
    if (!isServerMode()) {
      onSaved()
      return
    }
    // Already saved exactly these answers (for example, back from the complete screen).
    if (savedKey === savedAnswersKey(data)) {
      onSaved()
      return
    }
    if (!beginSave()) return
    setError(null)
    let answers = data
    // These answers belong to the session that is signed in now. Each request checks its own
    // session, but this is a chain of up to three, so it stops before the next one if another
    // account signed in (or the session ended) meanwhile.
    const generation = getSessionGeneration()
    const checkpoint = () => {
      if (getSessionGeneration() !== generation) {
        throw new ApiError({
          kind: 'http',
          status: 401,
          code: 'SESSION_CHANGED',
          message: '다시 로그인해주세요.',
        })
      }
    }
    try {
      let roomType = getConfirmedRoomType(answers)
      if (!roomType) {
        const resolved = await resolveRoomType(
          answers,
          getDormitoryApi(),
          checkpoint,
        )
        roomType = resolved.roomType
        // Keep the server's name and IDs, so a retry after a failed save reuses this room type.
        // Only while this screen is open: elsewhere the user may have typed something newer.
        if (isMountedRef.current) {
          const patch = {
            dormitory: resolved.dormitory.name,
            selectedDormitory: resolved.dormitory,
          }
          answers = { ...answers, ...patch }
          update(patch)
        }
      }
      checkpoint()
      await saveOnboarding(buildOnboardingRequest(answers, roomType.id))
      checkpoint()
      markSaved(savedAnswersKey(answers))
      if (isMountedRef.current) onSaved()
    } catch (caught) {
      if (!isMountedRef.current) return
      if (isRoomTypeRejected(caught)) update({ selectedDormitory: null })
      setError(describeSubmitError(caught))
    } finally {
      endSave()
    }
  }

  const clearError = () => setError(null)

  const state: SubmitState = isSaving
    ? { status: 'saving' }
    : error
      ? { status: 'failed', message: error }
      : { status: 'idle' }

  return { state, submit, clearError }
}
