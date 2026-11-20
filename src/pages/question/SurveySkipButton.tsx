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

  // The experience has its own, on the answer sheet (ExperienceSkipButton).
  if (isExperienceMode() || !isQaMode()) return null

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

/** Q2-2, the second topic's roommate question (two questions per topic). */
const SKIP_FROM_INDEX = 3

/**
 * `예시 답변으로 건너뛰기` (experience mode, 요청서 4.3): fills every question with an example
 * answer and marks the session, so the result and the recommendations read as examples. It sits
 * 3px above the top right of the answer sheet, like a skip control, and only on the question
 * screen, not over the STEP story (requested 2026-11-20).
 */
export function ExperienceSkipButton() {
  const navigate = useNavigate()
  const { fillExampleAnswers } = useExperienceSetup()
  const { index } = useQuestion()
  // From Q2-2 on (requested 2026-11-20): the participant answers a few questions themselves first.
  if (!isExperienceMode() || index < SKIP_FROM_INDEX) return null
  return (
    <button
      type="button"
      className="absolute right-5 bottom-[calc(100%+3px)] z-10 flex items-center gap-0.5 rounded-full bg-white/90 px-3 py-1 text-[12px] leading-[1.5] font-semibold whitespace-nowrap text-brand-brown3 shadow-[0_2px_6px_rgba(97,71,53,0.15)]"
      onClick={() => {
        fillExampleAnswers()
        navigate(QUESTION_ROUTES.loading)
      }}
    >
      예시 답변으로 건너뛰기
      <span aria-hidden>›</span>
    </button>
  )
}
