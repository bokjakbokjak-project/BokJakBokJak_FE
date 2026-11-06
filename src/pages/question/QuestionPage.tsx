import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react'
import { useNavigate } from 'react-router'
import backArrow from '../../assets/question/back-arrow-brown.svg'
import radioOff from '../../assets/question/radio-off.svg'
import radioOn from '../../assets/question/radio-on.svg'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import {
  QUESTION_COUNT,
  QUESTION_ROUTES,
  QUESTION_TOPICS,
  getQuestionStep,
} from './questionData'
import { useQuestion } from './questionState'

// Decided on 2026-11-07 (OPEN_QUESTIONS DE-6). FADE_DURATION matches duration-500 below.
const SITUATION_DURATION = 2000
const FADE_DURATION = 500

type Phase = 'situation' | 'fading' | 'question'

// During the situation the sheet rests lower, with its top at y=532 (Figma 1099:14106).
const LAYOUT = {
  default: {
    sceneTop: 'top-[47px]',
    sheetHeight: 'min-h-[378px]',
    sheetLowered: 'translate-y-[66px]',
  },
  compact: {
    sceneTop: 'top-[32px]',
    sheetHeight: 'min-h-[340px]',
    sheetLowered: 'translate-y-[28px]',
  },
}

type QuestionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline'
}

// PrimaryButton does not fit: these frames use a 10px radius and keep the brown fill when disabled.
function QuestionButton({
  variant = 'primary',
  disabled,
  ...props
}: QuestionButtonProps) {
  const color =
    variant === 'outline'
      ? 'border-[1.5px] border-brand-brown1 text-brand-brown1'
      : `bg-brand-brown1 ${disabled ? 'text-gray-300' : 'text-white'}`

  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex h-[65px] min-w-0 flex-1 items-center justify-center rounded-[10px] p-2.5 text-[20px] leading-[1.5] font-semibold ${color}`}
      {...props}
    />
  )
}

function TopicProgress({ topicIndex }: { topicIndex: number }) {
  return (
    <div
      role="progressbar"
      aria-label="설문 진행률"
      aria-valuemin={1}
      aria-valuemax={QUESTION_TOPICS.length}
      aria-valuenow={topicIndex + 1}
      className="flex w-full gap-[3px]"
    >
      {QUESTION_TOPICS.map((topic, index) => (
        <div
          key={topic.id}
          className={`h-1 flex-1 rounded-[100px] ${index <= topicIndex ? 'bg-brand-brown2' : 'bg-gray-100'}`}
        />
      ))}
    </div>
  )
}

type QuestionStepProps = {
  focusHeading: boolean
  onMove: (index: number) => void
}

/** Mounted once per question, so the situation timer starts over on every topic. */
function QuestionStep({ focusHeading, onMove }: QuestionStepProps) {
  const navigate = useNavigate()
  const { answers, answer, index } = useQuestion()
  const { topic, isSelf, question } = getQuestionStep(index)
  const topicIndex = Math.floor(index / 2)
  const selected = answers[index]
  const layout = LAYOUT[topic.layout]

  // An answered question has already shown its situation, so going back skips it.
  const [phase, setPhase] = useState<Phase>(
    isSelf && selected === undefined ? 'situation' : 'question',
  )
  const isQuestionShown = phase === 'question'
  const showPrevious = isQuestionShown && index > 0
  const sheetContent = `transition-opacity duration-500 motion-reduce:transition-none ${isQuestionShown ? '' : 'invisible opacity-0'}`

  useEffect(() => {
    if (phase === 'question') return
    const timer = setTimeout(
      () => setPhase(phase === 'situation' ? 'fading' : 'question'),
      phase === 'situation' ? SITUATION_DURATION : FADE_DURATION,
    )
    return () => clearTimeout(timer)
  }, [phase])

  const headingRef = useRef<HTMLHeadingElement>(null)

  // The next button is disabled on a new question, which would otherwise drop keyboard focus.
  useEffect(() => {
    if (focusHeading) headingRef.current?.focus()
  }, [focusHeading])

  const goBack = () => {
    if (index === 0) navigate(ONBOARDING_ROUTES.complete)
    else onMove(index - 1)
  }

  const goNext = () => {
    if (index === QUESTION_COUNT - 1) navigate(QUESTION_ROUTES.profile)
    else onMove(index + 1)
  }

  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden bg-question-surface md:rounded-[24px]">
      <img
        src={topic.scene}
        alt=""
        className={`absolute inset-x-0 -z-20 w-full ${layout.sceneTop}`}
      />
      <div className="absolute inset-x-0 top-0 -z-10 h-[292px] bg-[linear-gradient(to_bottom,var(--color-question-surface)_67.842%,rgba(255,255,255,0)_96.918%)]" />

      <div className="pt-[max(0px,calc(47px-env(safe-area-inset-top)))]">
        <header className="relative h-[59px]">
          <button
            type="button"
            aria-label="뒤로"
            className="absolute top-4 left-6 flex size-7 items-center justify-center rounded-full border-[1.5px] border-question-outline bg-brand-beige1"
            onClick={goBack}
          >
            <img src={backArrow} alt="" />
          </button>
        </header>
        <div className="flex flex-col items-center gap-2.5 px-6">
          <TopicProgress topicIndex={topicIndex} />
          {/* The copy swaps while transparent, so one transition fades it out and back in. The
              sheet uses the same duration, so it rises as the question appears. */}
          <div
            aria-live="polite"
            className={`text-center font-semibold text-brand-brown1 transition-opacity duration-500 motion-reduce:transition-none ${phase === 'fading' ? 'opacity-0' : ''}`}
          >
            {isQuestionShown && (
              <p className="mb-[5px] text-[20px] leading-[29px]">
                Q{index + 1}
              </p>
            )}
            <h1
              ref={headingRef}
              tabIndex={-1}
              className={`text-[18px] leading-[1.5] tracking-[-0.36px] whitespace-pre-line outline-none ${isQuestionShown ? '' : 'pt-2'}`}
            >
              {isQuestionShown ? question.text : topic.situation}
            </h1>
          </div>
        </div>
      </div>

      <div
        className={`mt-auto flex shrink-0 flex-col justify-between gap-[25px] rounded-t-[30px] bg-question-surface px-6 pt-[30px] pb-[max(0px,calc(44px-env(safe-area-inset-bottom)))] transition-[translate] duration-500 motion-reduce:transition-none ${layout.sheetHeight} ${isQuestionShown ? '' : layout.sheetLowered}`}
      >
        <fieldset className={`flex flex-col gap-px ${sheetContent}`}>
          <legend className="sr-only">{question.text}</legend>
          {question.options.map((option) => {
            const isSelected = option === selected
            return (
              <label
                key={option}
                className={`flex min-h-[42px] cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-1 text-[16px] font-medium text-brand-brown1 has-focus-visible:outline-2 has-focus-visible:outline-brand-brown1 ${isSelected ? 'border-question-selected-border bg-question-selected' : 'border-brand-beige5 bg-question-surface'}`}
              >
                <input
                  type="radio"
                  name={`question-${index}`}
                  value={option}
                  checked={isSelected}
                  className="sr-only"
                  onChange={() => answer(index, option)}
                />
                <img
                  src={isSelected ? radioOn : radioOff}
                  alt=""
                  className="size-5 shrink-0"
                />
                {option}
              </label>
            )
          })}
        </fieldset>
        <div className={`flex gap-1.5 ${sheetContent}`}>
          {showPrevious && (
            <QuestionButton variant="outline" onClick={() => onMove(index - 1)}>
              이전으로
            </QuestionButton>
          )}
          <QuestionButton disabled={selected === undefined} onClick={goNext}>
            다음으로
          </QuestionButton>
        </div>
      </div>
    </div>
  )
}

export default function QuestionPage() {
  const { index, setIndex } = useQuestion()
  const [hasMoved, setHasMoved] = useState(false)

  const move = (next: number) => {
    setHasMoved(true)
    setIndex(next)
  }

  return <QuestionStep key={index} focusHeading={hasMoved} onMove={move} />
}
