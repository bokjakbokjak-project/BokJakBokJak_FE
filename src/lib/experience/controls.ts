import { EXPERIENCE_ROUTES } from './mode'
import {
  getExperienceSession,
  restartAttempt,
  startNewParticipant,
} from './session'

/**
 * `처음부터` and `다음 참가자` (요청서 8.4). Both reload on the experience start screen, which
 * drops the in-memory answers and stops any scheduled reply; the session store decides what the
 * next screen sees.
 */
export function restartExperience() {
  restartAttempt()
  window.location.replace(EXPERIENCE_ROUTES.start)
}

export function nextParticipant() {
  startNewParticipant(getExperienceSession()?.purpose ?? 'booth')
  window.location.replace(EXPERIENCE_ROUTES.start)
}
