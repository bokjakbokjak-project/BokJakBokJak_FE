import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { useQuestion } from './questionState'

/**
 * Starts the survey retake: the priority step with the saved priorities, then the survey with the
 * saved answers, both prefilled to be changed (requested by the backend, 2026-11-20). Nothing is
 * saved until the survey is finished again; in server mode the priorities are saved with the
 * survey (PUT /api/me/survey). Used by the my page's 설문조사 다시 하기 and the home's
 * 내 설문 다시보기 (requested 2026-11-20).
 *
 * Server mode reads the saved survey first, so the priority step opens with it in place. The
 * retake starts only if this press is still current when the read comes back: `cancel` or
 * leaving the page drops it, and nothing changes.
 */
export function useStartRetake() {
  const navigate = useNavigate()
  const { readForRetake, startRetake, isSaving } = useQuestion()
  const [isStarting, setIsStarting] = useState(false)
  const attemptRef = useRef(0)
  // Set on every mount, since StrictMode runs the cleanup once in development.
  const isMountedRef = useRef(false)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const start = async () => {
    // Also while a survey save is still out, so the retake reads what that save leaves.
    if (isStarting || isSaving) return
    const attempt = (attemptRef.current += 1)
    setIsStarting(true)
    let saved
    try {
      saved = await readForRetake()
    } catch {
      // Another account signed in meanwhile: that session's screens take over.
      return
    }
    if (!isMountedRef.current || attemptRef.current !== attempt) return
    startRetake(saved)
    navigate(ONBOARDING_ROUTES.priority)
  }

  const cancel = () => {
    attemptRef.current += 1
    setIsStarting(false)
  }

  return { start, cancel, isBusy: isStarting || isSaving }
}
