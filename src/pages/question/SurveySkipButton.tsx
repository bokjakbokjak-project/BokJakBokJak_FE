import { useNavigate } from 'react-router'
import { isQaMode } from '../../lib/qa/qaMode'
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
