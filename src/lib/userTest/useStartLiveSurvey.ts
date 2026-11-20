import { useNavigate } from 'react-router'
import { useQuestion } from '../../pages/question/questionState'
import { useOnboarding } from '../onboarding/onboardingState'
import { ONBOARDING_ROUTES } from '../onboarding/routes'
import { getUserTestState, setExperienceMode } from './userTestStore'

/**
 * Leaves the browse mode for the real survey, which always starts at the priority step
 * (requested 2026-11-20).
 *
 * - Before the first survey it is the onboarding's priority step, with the shared basic
 *   information already filled in; the answers given so far stay.
 * - After a saved survey it is 마이페이지 「설문조사 다시 하기」: the saved priorities and answers
 *   come prefilled, and the new priorities go with the survey (the server refuses another
 *   onboarding save then).
 */
export function useStartLiveSurvey() {
  const navigate = useNavigate()
  const { update } = useOnboarding()
  const { readForRetake, startRetake } = useQuestion()

  return async (patch?: Parameters<typeof update>[0]) => {
    if (patch) update(patch)
    setExperienceMode('live')
    if (getUserTestState().surveyCompleted) {
      try {
        startRetake(await readForRetake())
      } catch {
        // Another account signed in meanwhile: that session's screens take over.
        return
      }
    }
    navigate(ONBOARDING_ROUTES.priority)
  }
}
