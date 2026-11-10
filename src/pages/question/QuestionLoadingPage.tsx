import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import alarm from '../../assets/question/loading/alarm.png'
import basin from '../../assets/question/loading/basin.png'
import broom from '../../assets/question/loading/broom.png'
import character from '../../assets/question/loading/character.png'
import pillow from '../../assets/question/loading/pillow.png'
import spray from '../../assets/question/loading/spray.png'
import towels from '../../assets/question/loading/towels.png'
import { QUESTION_COUNT, QUESTION_ROUTES } from './questionData'
import { useQuestion } from './questionState'
import { createSurveyProfile } from './surveyApi'

/** Shown at least this long, and longer while the profile is still being made. */
export const MIN_LOADING_DURATION = 2000

// Rendered bounds in the 390×844 Figma frame 1270:18704, as [x, y, width, height].
const PIECES = [
  { src: character, box: [48, 510, 302, 281] },
  { src: pillow, box: [0.85, 480.18, 52.19, 48.3] },
  { src: alarm, box: [125.86, 373.07, 41.14, 40.58] },
  { src: broom, box: [207.74, 355.52, 42.29, 67.54] },
  { src: basin, box: [43.66, 417.14, 47.3, 35.25] },
  { src: towels, box: [288.36, 411.77, 40.7, 32.45] },
  { src: spray, box: [338.27, 468.07, 34.99, 41.69] },
] as const

/** Figma 1270:18704, between the last question and the survey result. */
export default function QuestionLoadingPage() {
  const navigate = useNavigate()
  const { answers } = useQuestion()
  const isComplete = Object.keys(answers).length === QUESTION_COUNT

  const [hasWaited, setHasWaited] = useState(false)
  const [isProfileReady, setIsProfileReady] = useState(
    createSurveyProfile === null,
  )
  const [hasFailed, setHasFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const startedAttempt = useRef(-1)

  useEffect(() => {
    const timer = setTimeout(() => setHasWaited(true), MIN_LOADING_DURATION)
    return () => clearTimeout(timer)
  }, [])

  // Started once per attempt, so the development double run does not send twice.
  useEffect(() => {
    if (!createSurveyProfile || startedAttempt.current === attempt) return
    startedAttempt.current = attempt
    createSurveyProfile().then(
      () => setIsProfileReady(true),
      () => setHasFailed(true),
    )
  }, [attempt])

  // Replaces this entry, so back from the result returns to the survey, not to this screen.
  useEffect(() => {
    if (hasWaited && isProfileReady) {
      navigate(QUESTION_ROUTES.profile, { replace: true })
    }
  }, [hasWaited, isProfileReady, navigate])

  if (!isComplete) return <Navigate to={QUESTION_ROUTES.survey} replace />

  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden bg-question-surface md:rounded-[24px]">
      <div
        aria-hidden
        className="absolute bottom-0 left-1/2 -z-10 h-[844px] w-[390px] -translate-x-1/2"
      >
        {PIECES.map(({ src, box: [x, y, width, height] }) => (
          <img
            key={src}
            src={src}
            alt=""
            className="absolute max-w-none"
            style={{ left: x, top: y, width, height }}
          />
        ))}
      </div>

      <main
        aria-busy={!hasFailed}
        className="pt-[max(0px,calc(167px-env(safe-area-inset-top)))]"
      >
        <div className="px-[31px] font-bold text-brand-brown1">
          <h1 className="text-[32px] leading-[1.6] tracking-[0.8px]">
            잠시만 기다려 주세요,
          </h1>
          <p className="text-[24px] leading-[1.6] tracking-[0.6px]">
            프로필을 만들고 있어요
          </p>
        </div>
        <p className="mx-[11px] mt-1 text-center text-[12px] leading-[1.6] font-medium tracking-[0.3px] text-question-caption">
          알려주신 정보를 바탕으로 프로필을 작성할게요!
        </p>
        {/* Not in Figma. Only reachable once the profile API exists (OPEN_QUESTIONS DE-11). */}
        {hasFailed && (
          <div role="alert" className="mt-6 flex flex-col items-center gap-2">
            <p className="text-[14px] font-medium text-gray-500">
              프로필을 만들지 못했어요.
            </p>
            <button
              type="button"
              className="rounded-full border-2 border-question-outline bg-brand-beige1 px-4 py-1.5 text-[14px] font-semibold text-question-outline"
              onClick={() => {
                setHasFailed(false)
                setAttempt((current) => current + 1)
              }}
            >
              다시 시도
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
