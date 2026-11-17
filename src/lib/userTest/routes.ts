import { HOME_ROUTES } from '../home/routes'
import { ONBOARDING_ROUTES } from '../onboarding/routes'
import { QUESTION_ROUTES } from '../../pages/question/questionData'
import { ROOMMATE_ROUTES } from '../roommate/routes'
import type { UserTestState } from './userTestStore'

export const USER_TEST_ROUTES = {
  /** The notice and the choice between the survey and browsing. */
  start: '/user-test',
} as const

/**
 * Where the real flow picks up: the priority step until the onboarding is saved, then the
 * survey (which keeps the answers given so far), then the recommendations.
 */
export function liveEntryRoute(state: UserTestState) {
  if (!state.onboardingCompleted) return ONBOARDING_ROUTES.priority
  if (!state.surveyCompleted) return QUESTION_ROUTES.survey
  return ROOMMATE_ROUTES.list
}

/** The browse mode starts on the home, with the example character. */
export const DEMO_ENTRY_ROUTE = HOME_ROUTES.home
