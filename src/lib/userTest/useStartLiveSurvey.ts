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
 * - After a saved survey it starts over like 마이페이지 「설문조사 다시 하기」: the server refuses
 *   another onboarding save then, so the new priorities go with the survey.
 */
export function useStartLiveSurvey() {
  const navigate = useNavigate()
  const { update } = useOnboarding()
  const { startRetake } = useQuestion()

  return (patch?: Parameters<typeof update>[0]) => {
    if (patch) update(patch)
    setExperienceMode('live')
    if (getUserTestState().surveyCompleted) {
      update({ priorities: [] })
      startRetake()
    }
    navigate(ONBOARDING_ROUTES.priority)
  }
}
