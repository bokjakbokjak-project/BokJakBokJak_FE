import { useOnboarding } from '../../lib/onboarding/onboardingState'
import { isPriorityComplete } from '../../lib/onboarding/priority'
import { getTopicOrder } from './questionData'
import { useQuestion } from './questionState'

/**
 * The topic order of the survey screens, from the priorities the survey is saved with: the ones
 * chosen in this session, or else the saved ones (the same choice as useSurveySubmit). Without
 * either, the topics keep their usual order.
 */
export function useQuestionOrder() {
  const { data: onboarding } = useOnboarding()
  const { sync } = useQuestion()
  const priorities = isPriorityComplete(onboarding.priorities)
    ? onboarding.priorities
    : sync.status === 'ready'
      ? sync.priorities
      : []
  return getTopicOrder(priorities)
}
