import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
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
  type QuestionTopic,
} from './questionData'
import { useQuestion } from './questionState'

// Prototype in Figma 1377:49785: the STEP screen waits 2 seconds, then dissolves into the
// question over 0.8 seconds with Figma's ease in and out. `상황 보기` and `질문 보기` use the same dissolve
// (OPEN_QUESTIONS DE-6).
const SITUATION_DURATION = 2000
const DISSOLVE_CLASS =
  'transition-[opacity,visibility] duration-800 ease-[cubic-bezier(0.42,0,0.58,1)] motion-reduce:transition-none'

const LAYOUT = {
  default: { sceneTop: 'top-[47px]', sheetHeight: 'min-h-[380px]' },
  compact: { sceneTop: 'top-[32px]', sheetHeight: 'min-h-[342px]' },
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

/** The dark STEP screen uses light segments (Figma 1377:28956). */
function TopicProgress({
  topicIndex,
  tone = 'light',
}: {
  topicIndex: number
  tone?: 'light' | 'dark'
}) {
  const [filled, empty] =
    tone === 'dark'
      ? ['bg-brand-beige1', 'bg-gray-500']
      : ['bg-brand-brown2', 'bg-gray-100']
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
          className={`h-1 flex-1 rounded-[100px] ${index <= topicIndex ? filled : empty}`}
        />
      ))}
    </div>
  )
}

/** Back button and the pill on the right (`상황 보기`, `질문 보기`), Figma 1352:19421. */
function SurveyHeader({
  onBack,
  children,
}: {
  onBack: () => void
  children?: ReactNode
}) {
  return (
    <header className="relative h-[59px]">
      <button
        type="button"
        aria-label="뒤로"
        className="absolute top-4 left-6 flex size-7 items-center justify-center rounded-full border-[1.5px] border-question-outline bg-brand-beige1"
        onClick={onBack}
      >
        <img src={backArrow} alt="" />
      </button>
      {children}
    </header>
  )
}

const PILL_CLASS =
  'absolute top-[9px] right-6 flex h-[35px] items-center rounded-full border-2 border-question-outline bg-brand-beige1 px-2.5 text-[14px] leading-[1.5] font-semibold tracking-[-0.28px] text-question-outline'

type SituationScreenProps = {
  topic: QuestionTopic
  topicIndex: number
  isVisible: boolean
  /** Shown when the screen was opened from the question, Figma 1377:28755. */
  showQuestionButton: boolean
  questionButtonRef: React.RefObject<HTMLButtonElement | null>
  onShowQuestion: () => void
  onBack: () => void
}

/**
 * STEP screen, Figma 1352:18210 (dark) and 1528:26236 (light). Only these two topics have a
 * full-height picture, so the others put the question picture on the light layout (DE-10).
 */
function SituationScreen({
  topic,
  topicIndex,
  isVisible,
  showQuestionButton,
  questionButtonRef,
  onShowQuestion,
  onBack,
}: SituationScreenProps) {
  const tone = topic.situationScene?.tone ?? 'light'
  return (
    <section
      aria-label={`STEP ${topicIndex + 1} 상황`}
      inert={!isVisible}
      // Mirrors inert for tools and browsers that do not support it yet.
      aria-hidden={!isVisible || undefined}
      className={`absolute inset-0 z-20 isolate overflow-hidden bg-question-surface ${DISSOLVE_CLASS} ${isVisible ? 'visible opacity-100' : 'invisible opacity-0'}`}
    >
      {topic.situationScene ? (
        <img
          src={topic.situationScene.src}
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover object-bottom"
        />
      ) : (
        <>
          <img
            src={topic.scene}
            alt=""
            className="absolute inset-x-0 bottom-[204px] -z-20 w-full"
          />
          <div className="absolute inset-x-0 top-0 -z-10 h-[340px] bg-[linear-gradient(to_bottom,var(--color-question-surface)_45%,rgba(255,255,255,0)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-[330px] bg-[linear-gradient(to_top,var(--color-question-surface)_62%,rgba(255,255,255,0)_100%)]" />
        </>
      )}

      <div className="pt-[max(0px,calc(47px-env(safe-area-inset-top)))]">
        <SurveyHeader onBack={onBack}>
          {showQuestionButton && (
            <button
              ref={questionButtonRef}
              type="button"
              className={PILL_CLASS}
              onClick={onShowQuestion}
            >
              질문 보기
            </button>
          )}
        </SurveyHeader>
        <div className="px-6">
          <TopicProgress topicIndex={topicIndex} tone={tone} />
        </div>
      </div>

      <div className="absolute bottom-[110px] left-[25px] flex flex-col items-start gap-3 pr-6">
        <p className="rounded-full bg-question-outline px-3 py-1.5 text-[14px] leading-[1.5] font-semibold tracking-[-0.28px] text-white">
          STEP {topicIndex + 1}
        </p>
        <h2
          className={`text-[20px] leading-[1.5] font-semibold tracking-[-0.4px] break-keep whitespace-pre-line ${tone === 'dark' ? 'text-white' : 'text-brand-brown1'}`}
        >
          {topic.situation}
        </h2>
      </div>
    </section>
  )
}

type QuestionStepProps = {
  focusHeading: boolean
  onMove: (index: number) => void
}

/** Mounted once per question, so the STEP timer starts over on every topic. */
function QuestionStep({ focusHeading, onMove }: QuestionStepProps) {
  const navigate = useNavigate()
  const { answers, answer, index } = useQuestion()
  const { topic, isSelf, question } = getQuestionStep(index)
  const topicIndex = Math.floor(index / 2)
  const selected = answers[index]
  const layout = LAYOUT[topic.layout]

  // Each topic opens on its STEP screen. An answered question has seen it already, so going
  // back skips it, but `상황 보기` can always bring it back.
  const [situation, setSituation] = useState({
    isVisible: isSelf && selected === undefined,
    fromQuestion: false,
  })

  useEffect(() => {
    if (!situation.isVisible || situation.fromQuestion) return
    const timer = setTimeout(
      () => setSituation({ isVisible: false, fromQuestion: false }),
      SITUATION_DURATION,
    )
    return () => clearTimeout(timer)
  }, [situation])

  const headingRef = useRef<HTMLHeadingElement>(null)
  const situationButtonRef = useRef<HTMLButtonElement>(null)
  const questionButtonRef = useRef<HTMLButtonElement>(null)

  // Keeps keyboard focus on the screen that is showing. The question is inert under the STEP
  // screen, so its heading can only take focus after the STEP screen leaves.
  useEffect(() => {
    if (situation.isVisible) {
      if (situation.fromQuestion) questionButtonRef.current?.focus()
    } else if (situation.fromQuestion) {
      situationButtonRef.current?.focus()
    } else if (focusHeading) {
      headingRef.current?.focus()
    }
  }, [situation, focusHeading])

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
      <div
        inert={situation.isVisible}
        aria-hidden={situation.isVisible || undefined}
        className="flex flex-1 flex-col"
      >
        <img
          src={topic.scene}
          alt=""
          className={`absolute inset-x-0 -z-20 w-full ${layout.sceneTop}`}
        />
        <div className="absolute inset-x-0 top-0 -z-10 h-[292px] bg-[linear-gradient(to_bottom,var(--color-question-surface)_67.842%,rgba(255,255,255,0)_96.918%)]" />

        <div className="pt-[max(0px,calc(47px-env(safe-area-inset-top)))]">
          <SurveyHeader onBack={goBack}>
            <button
              ref={situationButtonRef}
              type="button"
              className={PILL_CLASS}
              onClick={() =>
                setSituation({ isVisible: true, fromQuestion: true })
              }
            >
              상황 보기
            </button>
          </SurveyHeader>
          <div className="flex flex-col items-center gap-2.5 px-6">
            <TopicProgress topicIndex={topicIndex} />
            <div className="text-center font-semibold text-brand-brown1">
              {/* Figma numbers the pair by topic: Q1-1 is mine, Q1-2 is the roommate's. */}
              <p className="mb-[5px] text-[20px] leading-[29px]">
                Q{topicIndex + 1}-{isSelf ? 1 : 2}
              </p>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="text-[18px] leading-[1.5] tracking-[-0.36px] whitespace-pre-line outline-none"
              >
                {question.text}
              </h1>
            </div>
          </div>
        </div>

        <div
          className={`mt-auto flex shrink-0 flex-col justify-between gap-[25px] rounded-t-[35px] border border-question-sheet-border bg-question-surface pt-[30px] pr-[23px] pb-[max(0px,calc(44px-env(safe-area-inset-bottom)))] pl-[23px] ${layout.sheetHeight}`}
        >
          <fieldset className="flex flex-col gap-px">
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
          <div className="flex gap-1.5">
            {index > 0 && (
              <QuestionButton
                variant="outline"
                onClick={() => onMove(index - 1)}
              >
                이전으로
              </QuestionButton>
            )}
            <QuestionButton disabled={selected === undefined} onClick={goNext}>
              다음으로
            </QuestionButton>
          </div>
        </div>
      </div>

      <SituationScreen
        topic={topic}
        topicIndex={topicIndex}
        isVisible={situation.isVisible}
        showQuestionButton={situation.fromQuestion}
        questionButtonRef={questionButtonRef}
        onShowQuestion={() =>
          setSituation({ isVisible: false, fromQuestion: true })
        }
        onBack={goBack}
      />
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
