import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useOnboarding } from '../onboarding/onboardingState'
import type { CategoryId } from '../onboarding/categories'
import { ONBOARDING_ROUTES } from '../onboarding/routes'
import { getCandidate } from '../roommate/roommateData'
import { ROOMMATE_ROUTES } from '../roommate/routes'
import { HOME_ROUTES } from '../home/routes'
import {
  QUESTION_COUNT,
  QUESTION_ROUTES,
  getQuestionStep,
} from '../../pages/question/questionData'
import { useQuestion } from '../../pages/question/questionState'
import { startExperienceChat } from './experienceChat'
import { EXPERIENCE_ROUTES } from './mode'
import { EXPERIENCE_PROFILE, FILM_PRIORITIES } from './profile'
import { EXAMPLE_PARTNER } from './scenarios'
import { updateExperienceSession } from './session'

export type ExperienceScene =
  'priority' | 'survey' | 'list' | 'analysis' | 'chat' | 'home'

export const SCENE_LABELS: Record<ExperienceScene, string> = {
  priority: '우선순위',
  survey: '설문',
  list: '추천 목록',
  analysis: '매칭 분석',
  chat: '조율 채팅',
  home: '매칭 완료 홈',
}

/** Every question answered with an example option. */
export function exampleAnswers(): Record<number, string> {
  return Object.fromEntries(
    Array.from({ length: QUESTION_COUNT }, (_, index) => [
      index,
      getQuestionStep(index).question.options[0],
    ]),
  )
}

/**
 * The experience's ways in, each preparing what its screen needs before opening it (요청서 4.1:
 * a scene jump prepares the state, not only the address).
 */
export function useExperienceSetup() {
  const navigate = useNavigate()
  const { update } = useOnboarding()
  const { replaceAnswers, setIndex } = useQuestion()

  /** The shared basic information, and the priorities when given. */
  const seed = useCallback(
    (priorities: readonly CategoryId[]) => {
      update({ ...EXPERIENCE_PROFILE, priorities: [...priorities] })
    },
    [update],
  )

  /** `예시 답변으로 건너뛰기`: example answers, marked so the result says they are examples. */
  const fillExampleAnswers = useCallback(() => {
    const answers = exampleAnswers()
    replaceAnswers(answers)
    setIndex(QUESTION_COUNT - 1)
    updateExperienceSession((session) => ({
      ...session,
      answers,
      surveySkipped: true,
    }))
  }, [replaceAnswers, setIndex])

  /** The experience start: its own priorities, chosen on the priority step. */
  const begin = useCallback(() => {
    seed([])
    replaceAnswers({})
    setIndex(0)
    navigate(ONBOARDING_ROUTES.priority)
  }, [seed, replaceAnswers, setIndex, navigate])

  const jumpTo = useCallback(
    (scene: ExperienceScene) => {
      if (scene === 'priority') {
        begin()
        return
      }
      seed(FILM_PRIORITIES)
      updateExperienceSession((session) => ({
        ...session,
        priorities: [...FILM_PRIORITIES],
      }))
      if (scene === 'survey') {
        replaceAnswers({})
        setIndex(0)
        navigate(QUESTION_ROUTES.survey)
        return
      }
      fillExampleAnswers()
      const example = getCandidate(EXAMPLE_PARTNER.candidateId)
      if (scene === 'list') navigate(ROOMMATE_ROUTES.list)
      else if (scene === 'analysis')
        navigate(ROOMMATE_ROUTES.analysis(EXAMPLE_PARTNER.candidateId))
      else if (scene === 'chat') {
        startExperienceChat({
          name: example?.name ?? EXAMPLE_PARTNER.name,
          candidateId: EXAMPLE_PARTNER.candidateId,
          source: 'example',
          adjust: example?.analysis.adjust ?? [],
        })
        navigate(EXPERIENCE_ROUTES.chat)
      } else {
        // The end of the run: the example match the chat would have finished.
        updateExperienceSession((session) => ({
          ...session,
          chat: null,
          matched: { name: example?.name ?? EXAMPLE_PARTNER.name },
        }))
        navigate(HOME_ROUTES.home)
      }
    },
    [begin, seed, replaceAnswers, setIndex, navigate, fillExampleAnswers],
  )

  return { seed, begin, jumpTo, fillExampleAnswers }
}
