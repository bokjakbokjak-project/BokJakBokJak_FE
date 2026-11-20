import { isUserTestEnabled } from './config'
import { queuePrompt } from './feedback'
import { markSurveyCompleted } from './userTestStore'

/**
 * A full survey was saved with the server (PUT /api/me/survey answered). Only this queues Q1:
 * finishing the priorities, or leaving the survey for the browse mode, does not.
 */
export function recordSurveySaved() {
  if (!isUserTestEnabled()) return
  markSurveyCompleted()
  queuePrompt('q1_discovery', null, 'real')
}
