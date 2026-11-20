import { useNavigate } from 'react-router'
import { isQaMode } from '../../lib/qa/qaMode'
import { isExperienceMode } from '../../lib/experience/mode'
import { useExperienceSetup } from '../../lib/experience/useExperienceSetup'
import {
  QUESTION_COUNT,
  QUESTION_ROUTES,
  getQuestionStep,
} from './questionData'
import { useQuestion } from './questionState'

/**
 * QA only, not in Figma: answers every question with its first option and goes to the loading
 * screen, so a tester reaches the result without taking the survey each time. Hidden unless QA
 * mode is on (`src/lib/qa/qaMode.ts`).
 */
export default function SurveySkipButton() {
  const navigate = useNavigate()
  const { answer, setIndex } = useQuestion()

  // The experience offers it to everyone, as example answers the result labels (요청서 4.3).
  if (isExperienceMode()) return <ExperienceSkipButton />
  if (!isQaMode()) return null

  const skip = () => {
    for (let index = 0; index < QUESTION_COUNT; index += 1) {
      answer(index, getQuestionStep(index).question.options[0])
    }
    setIndex(QUESTION_COUNT - 1)
    navigate(QUESTION_ROUTES.loading)
  }

  return (
    <button
      type="button"
      className="absolute top-[max(10px,calc(env(safe-area-inset-top)+4px))] left-1/2 z-40 -translate-x-1/2 rounded-full border border-dashed border-brand-brown3 bg-white/90 px-3 py-1 text-[12px] leading-[1.5] font-semibold text-brand-brown3"
      onClick={skip}
    >
      테스트: 설문 건너뛰기
    </button>
  )
}

/**
 * `예시 답변으로 건너뛰기` (experience mode): fills every question with an example answer and
 * marks the session, so the result and the recommendations read as examples.
 */
function ExperienceSkipButton() {
  const navigate = useNavigate()
  const { fillExampleAnswers } = useExperienceSetup()
  return (
    <button
      type="button"
      className="absolute bottom-[max(116px,calc(env(safe-area-inset-bottom)+92px))] left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full border border-brand-brown3 bg-white/95 px-3 py-1 text-[12px] leading-[1.5] font-semibold text-brand-brown3 shadow-[0_2px_6px_rgba(97,71,53,0.15)]"
      onClick={() => {
        fillExampleAnswers()
        navigate(QUESTION_ROUTES.loading)
      }}
    >
      예시 답변으로 건너뛰기
    </button>
  )
}
