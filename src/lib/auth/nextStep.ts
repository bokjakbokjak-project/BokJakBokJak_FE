import { HOME_ROUTES } from '../home/routes'
import { ONBOARDING_ROUTES } from '../onboarding/routes'
import { QUESTION_ROUTES } from '../../pages/question/questionData'
import type { NextStep } from './authDto'

/** Where `next_step` from the login answer leads, using the existing screens. */
export function routeForNextStep(step: NextStep): string {
  switch (step) {
    case 'ONBOARDING':
      return ONBOARDING_ROUTES.school
    case 'SURVEY':
      return QUESTION_ROUTES.survey
    case 'HOME':
      return HOME_ROUTES.home
  }
}
