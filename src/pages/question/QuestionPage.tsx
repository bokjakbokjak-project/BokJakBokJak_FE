import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type TransitionEvent,
} from 'react'
import { useNavigate } from 'react-router'
import backArrow from '../../assets/question/back-arrow-brown.svg'
import radioOff from '../../assets/question/radio-off.svg'
import radioOn from '../../assets/question/radio-on.svg'
import ChoiceDialog from '../../components/dialog/ChoiceDialog'
import { ErrorState } from '../../components/LoadState/LoadState'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import { isPriorityComplete } from '../../lib/onboarding/priority'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { isQuestionBlocked } from '../../lib/survey/surveyMapping'
import { useSavedSurvey } from '../../lib/survey/useSurvey'
import {
  QUESTION_COUNT,
  QUESTION_ROUTES,
  QUESTION_TOPICS,
  SURVEY_IMAGES,
  getQuestionIndex,
  getQuestionStep,
  getStepOf,
  type QuestionTopic,
} from './questionData'
import { useQuestion } from './questionState'
import { useQuestionOrder } from './useQuestionOrder'
import SurveySkipButton, { ExperienceSkipButton } from './SurveySkipButton'
import BrowseInsteadButton from '../../components/userTest/BrowseInsteadButton'
import FullPageLoading from '../../components/LoadState/FullPageLoading'

// Prototype in Figma 1377:49785: the STEP screen waits, then dissolves into the question over
// 0.8 seconds with Figma's ease in and out. `상황 보기` and `질문 다시보기` use the same dissolve
// (OPEN_QUESTIONS DE-6). The wait was 2 seconds in Figma; shortened to 1.2 seconds on request
// (2026-11-20).
const SITUATION_DURATION = 1200
const DISSOLVE_CLASS =
  'transition-[opacity,visibility] duration-800 ease-[cubic-bezier(0.42,0,0.58,1)] motion-reduce:transition-none'

/**
 * The STEP screen and the question never show together: the leaving one fades out completely
 * first, and only then does the other fade in, with the same dissolve. `null` is the moment in
 * between, while the leaving layer fades out.
 */
type Layer = 'step' | 'question'
const otherLayer = (layer: Layer): Layer =>
  layer === 'step' ? 'question' : 'step'

/** With reduced motion there is no fade, so there is no fade end to wait for. */
const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const layerClass = (isShown: boolean) =>
  `${DISSOLVE_CLASS} ${isShown ? 'visible opacity-100' : 'invisible opacity-0'}`

const LAYOUT = {
  default: {
    sceneTop: 'top-[47px]',
    sheetHeight: 'min-h-[380px]',
    sheetGap: 'gap-[25px]',
  },
  compact: {
    sceneTop: 'top-[32px]',
    sheetHeight: 'min-h-[342px]',
    sheetGap: 'gap-[25px]',
  },
  // The 온도 frames (2441:21272, 2441:21608) put the picture at 119px and a 327px sheet whose
  // button sits 17px below the options (2441:21478).
  low: {
    sceneTop: 'top-[119px]',
    sheetHeight: 'min-h-[327px]',
    sheetGap: 'gap-[17px]',
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

/** Back button and the pill on the right (`상황 보기`, `질문 다시보기`), Figma 1352:19421. */
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
        className="absolute top-4 left-6 flex size-7 items-center justify-center rounded-full border-[1.5px] border-transparent transition-colors hover:border-question-outline hover:bg-brand-beige1 focus-visible:border-question-outline focus-visible:bg-brand-beige1"
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
  onFadeEnd: (event: TransitionEvent<HTMLElement>) => void
  /** The picture has loaded (or failed), so it can be revealed and the wait can start. */
  isLoaded: boolean
  onLoaded: () => void
}

/**
 * STEP screen, Figma 1352:18210 (dark), 1528:26236 and 2441:20834 (light). Only these topics have
 * a full-height picture, so the others put the question picture on the light layout (DE-10).
 */
function SituationScreen({
  topic,
  topicIndex,
  isVisible,
  showQuestionButton,
  questionButtonRef,
  onShowQuestion,
  onBack,
  onFadeEnd,
  isLoaded,
  onLoaded,
}: SituationScreenProps) {
  const tone = topic.situationScene?.tone ?? 'light'
  // The picture shows only once it has fully loaded, and the copy fades in after it (requested
  // 2026-11-20), instead of painting in line by line on a slow network. The survey loads every picture ahead (SURVEY_IMAGES), so this is usually at once.
  const onLoad = onLoaded
  // A picture the browser already holds (preloaded or cached) counts as loaded at once.
  const imageRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    if (imageRef.current?.complete) onLoaded()
  }, [onLoaded])
  // Without the top-down wipe (dropped on request, 2026-11-20): the picture just appears once
  // loaded, so it never paints in line by line.
  const artClass = isLoaded ? '' : 'invisible'
  return (
    <section
      aria-label={`STEP ${topicIndex + 1} 상황`}
      inert={!isVisible}
      // Mirrors inert for tools and browsers that do not support it yet.
      aria-hidden={!isVisible || undefined}
      onTransitionEnd={onFadeEnd}
      className={`absolute inset-0 z-20 isolate overflow-hidden bg-question-surface ${layerClass(isVisible)}`}
    >
      <div
        data-testid="situation-art"
        data-loaded={isLoaded || undefined}
        className={`absolute inset-0 -z-10 ${artClass}`}
      >
        {topic.situationScene ? (
          <>
            <img
              src={topic.situationScene.src}
              alt=""
              ref={imageRef}
              decoding="async"
              onLoad={onLoad}
              onError={onLoad}
              className="absolute inset-0 -z-10 size-full object-cover object-bottom"
            />
            {/* QA 4: the light STEP frames (1528:26236, 1377:28501) fade the scene into the page
                color behind the text, and the exported image does not include it. */}
            {tone === 'light' && (
              <div
                data-testid="situation-bottom-fade"
                className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[292px] bg-[linear-gradient(to_top,var(--color-question-surface)_70%,rgba(255,255,255,0)_100%)]"
              />
            )}
          </>
        ) : (
          <>
            <img
              src={topic.scene}
              alt=""
              ref={imageRef}
              decoding="async"
              onLoad={onLoad}
              onError={onLoad}
              className="absolute inset-x-0 bottom-[204px] -z-20 w-full"
            />
            <div className="absolute inset-x-0 top-0 -z-10 h-[340px] bg-[linear-gradient(to_bottom,var(--color-question-surface)_45%,rgba(255,255,255,0)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 -z-10 h-[330px] bg-[linear-gradient(to_top,var(--color-question-surface)_62%,rgba(255,255,255,0)_100%)]" />
          </>
        )}
      </div>

      <div className="pt-[max(0px,calc(47px-env(safe-area-inset-top)))]">
        <SurveyHeader onBack={onBack}>
          {showQuestionButton && (
            <button
              ref={questionButtonRef}
              type="button"
              className={PILL_CLASS}
              onClick={onShowQuestion}
            >
              질문 다시보기
            </button>
          )}
        </SurveyHeader>
        <div className="px-6">
          <TopicProgress topicIndex={topicIndex} tone={tone} />
        </div>
      </div>

      {/* Every STEP frame starts the badge 215px above the bottom (y 629 of 844), so a third line
          of copy (온도, 2441:21048) grows down instead of pushing the badge up. */}
      <div
        className={`absolute top-[calc(100%-215px)] left-[25px] flex flex-col items-start gap-3 pr-6 ${isLoaded ? 'motion-safe:animate-situation-copy' : 'opacity-0'}`}
      >
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
  /** The step on screen (0-15), in the survey order. */
  index: number
  /** The question index (0-15) shown at this step, the key of its answer. */
  questionIndex: number
  focusHeading: boolean
  onMove: (index: number) => void
}

/**
 * Mounted once per question, so the STEP timer starts over on every topic. `index` is the step on
 * screen, numbered in the priority order (STEP, Q and the progress follow it); `questionIndex` is
 * the question asked there.
 */
function QuestionStep({
  index,
  questionIndex,
  focusHeading,
  onMove,
}: QuestionStepProps) {
  const navigate = useNavigate()
  const { answers, answer, sync } = useQuestion()
  const { topic, isSelf, question } = getQuestionStep(questionIndex)
  const topicIndex = Math.floor(index / 2)
  const selected = answers[questionIndex]
  const layout = LAYOUT[topic.layout]
  // Server mode: this question's options do not match the server survey (BEDTIME_H while the
  // server sends seven options), so the survey cannot be saved yet. The user can still answer.
  const isBlocked =
    sync.status === 'ready' && isQuestionBlocked(sync.mapping, questionIndex)

  // Each topic opens on its STEP screen. An answered question has seen it already, so going
  // back skips it, but `상황 보기` can always bring it back.
  const [shown, setShown] = useState<Layer | null>(
    isSelf && selected === undefined ? 'step' : 'question',
  )
  /** The STEP screen was opened with `상황 보기`, so it waits for `질문 다시보기`. */
  const [fromQuestion, setFromQuestion] = useState(false)

  // Starts fading `from` out. A press that arrives during a change does nothing, so fast
  // repeated presses cannot stack up.
  const leave = (from: Layer) =>
    setShown((current) =>
      current !== from
        ? current
        : prefersReducedMotion()
          ? otherLayer(from)
          : null,
    )

  // The other layer fades in only once `from` has faded out completely. A reversed fade (a
  // press while a layer is still fading in) also ends here, at full transparency.
  const handleFadeEnd =
    (from: Layer) => (event: TransitionEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return
      if (event.propertyName === 'visibility') return
      setShown((current) => (current === null ? otherLayer(from) : current))
    }

  // The STEP picture has loaded: the wait starts only then, so a slow network still shows it.
  const [isStepLoaded, setIsStepLoaded] = useState(false)
  const markStepLoaded = useCallback(() => setIsStepLoaded(true), [])
  useEffect(() => {
    if (shown !== 'step' || fromQuestion || !isStepLoaded) return
    const timer = setTimeout(() => leave('step'), SITUATION_DURATION)
    return () => clearTimeout(timer)
  }, [shown, fromQuestion, isStepLoaded])

  const headingRef = useRef<HTMLHeadingElement>(null)
  const situationButtonRef = useRef<HTMLButtonElement>(null)
  const questionButtonRef = useRef<HTMLButtonElement>(null)

  // Keeps keyboard focus on the screen that is showing. The question is inert under the STEP
  // screen, so its heading can only take focus after the STEP screen leaves.
  useEffect(() => {
    if (shown === 'step') {
      if (fromQuestion) questionButtonRef.current?.focus()
    } else if (shown === 'question') {
      if (fromQuestion) situationButtonRef.current?.focus()
      else if (focusHeading) headingRef.current?.focus()
    }
  }, [shown, fromQuestion, focusHeading])

  const goBack = () => {
    if (index === 0) navigate(ONBOARDING_ROUTES.complete)
    else onMove(index - 1)
  }

  // Back on a topic's first question opens its STEP screen again (requested 2026-11-20), and it
  // moves on to the question by itself after the same wait as when the topic first opened
  // (requested 2026-11-21). Back on the STEP screen still leaves as before.
  const backFromQuestion = () => {
    if (!isSelf) {
      goBack()
      return
    }
    setFromQuestion(false)
    leave('question')
  }

  const goNext = () => {
    if (index === QUESTION_COUNT - 1) navigate(QUESTION_ROUTES.loading)
    else onMove(index + 1)
  }

  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden bg-question-surface md:rounded-[24px]">
      <div
        inert={shown !== 'question'}
        aria-hidden={shown !== 'question' || undefined}
        onTransitionEnd={handleFadeEnd('question')}
        data-testid="question-layer"
        className={`flex flex-1 flex-col ${layerClass(shown === 'question')}`}
      >
        <img
          src={topic.scene}
          alt=""
          className={`absolute inset-x-0 -z-20 w-full ${layout.sceneTop}`}
        />
        <div className="absolute inset-x-0 top-0 -z-10 h-[292px] bg-[linear-gradient(to_bottom,var(--color-question-surface)_67.842%,rgba(255,255,255,0)_96.918%)]" />

        <div className="pt-[max(0px,calc(47px-env(safe-area-inset-top)))]">
          <SurveyHeader onBack={backFromQuestion}>
            <button
              ref={situationButtonRef}
              type="button"
              className={PILL_CLASS}
              onClick={() => {
                if (shown !== 'question') return
                setFromQuestion(true)
                leave('question')
              }}
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
          className={`relative mt-auto flex shrink-0 flex-col justify-between rounded-t-[35px] border border-question-sheet-border bg-question-surface pt-[30px] pr-[23px] pb-[max(0px,calc(44px-env(safe-area-inset-bottom)))] pl-[23px] ${layout.sheetGap} ${layout.sheetHeight}`}
        >
          <ExperienceSkipButton />
          <fieldset className="flex flex-col gap-px">
            <legend className="sr-only">{question.text}</legend>
            {/* Not in Figma: shown only while the server survey does not match (BE-9). */}
            {isBlocked && (
              <p
                role="note"
                className="mb-2 text-[13px] leading-[1.5] break-keep text-gray-500"
              >
                이 문항은 서버 설문과 선택지가 맞지 않아 지금은 설문을 저장할 수
                없어요. 다른 문항은 계속 답할 수 있어요.
              </p>
            )}
            {question.options.map((option) => {
              const isSelected = option === selected
              return (
                <label
                  key={option}
                  className={`flex min-h-[42px] cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-1 text-[16px] font-medium text-brand-brown1 has-focus-visible:outline-2 has-focus-visible:outline-brand-brown1 ${isSelected ? 'border-question-selected-border bg-question-selected' : 'border-brand-beige5 bg-question-surface'}`}
                >
                  <input
                    type="radio"
                    name={`question-${questionIndex}`}
                    value={option}
                    checked={isSelected}
                    className="sr-only"
                    onChange={() => answer(questionIndex, option)}
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
        isVisible={shown === 'step'}
        showQuestionButton={fromQuestion}
        questionButtonRef={questionButtonRef}
        onShowQuestion={() => leave('step')}
        onBack={goBack}
        onFadeEnd={handleFadeEnd('step')}
        isLoaded={isStepLoaded}
        onLoaded={markStepLoaded}
      />
      <SurveySkipButton />
      <BrowseInsteadButton />
    </div>
  )
}

/** The first step, in the survey order, whose question has no answer, or null when all do. */
function firstUnanswered(
  answers: Readonly<Record<number, string>>,
  order: readonly number[],
) {
  for (let step = 0; step < QUESTION_COUNT; step += 1) {
    if (answers[getQuestionIndex(order, step)] === undefined) return step
  }
  return null
}

/**
 * Loads every survey picture once, when the survey opens, so each STEP screen and question shows
 * its picture at once instead of waiting for it on a slow network (requested 2026-11-20).
 */
function usePreloadSurveyImages() {
  useEffect(() => {
    for (const src of SURVEY_IMAGES) {
      const image = new Image()
      image.decoding = 'async'
      image.src = src
    }
  }, [])
}

/**
 * The step to show after the topic order changed (the priorities were changed on the priority
 * step and the survey opened again): the question shown before, at its step in the new order, or
 * an earlier step that still has no answer, so no question is skipped or asked twice.
 */
function moveToOrder(
  answers: Readonly<Record<number, string>>,
  step: number,
  from: string,
  order: readonly number[],
) {
  const previous = from.split(',').map(Number)
  const same = getStepOf(order, getQuestionIndex(previous, step))
  const unanswered = firstUnanswered(answers, order)
  return unanswered === null ? same : Math.min(same, unanswered)
}

export default function QuestionPage() {
  usePreloadSurveyImages()
  const {
    index: savedIndex,
    indexOrder,
    setIndex,
    sync,
    isRetake,
    choosePriorities,
    answers,
    hasSeenUpdateNotice,
    markUpdateNoticeSeen,
  } = useQuestion()
  const [hasMoved, setHasMoved] = useState(false)
  const noticeTriggerRef = useRef<HTMLElement>(null)
  // Server mode: the questions open once the saved survey is read, so a saved answer is already
  // selected when its screen first shows.
  const saved = useSavedSurvey()
  const navigate = useNavigate()
  const { data: onboarding } = useOnboarding()
  const order = useQuestionOrder()
  const orderKey = order.join()
  const index =
    indexOrder === null || indexOrder === orderKey
      ? savedIndex
      : moveToOrder(answers, savedIndex, indexOrder, order)
  // A first survey needs the onboarding priorities. They come from this session or, after a
  // new sign-in, from GET /api/me/survey. If neither has them, the user picks them before the
  // questions instead of finding out after answering all 16; they are saved with the survey.
  const needsPriorities =
    sync.status === 'ready' &&
    !isRetake &&
    sync.priorities.length === 0 &&
    !isPriorityComplete(onboarding.priorities)

  useEffect(() => {
    if (!needsPriorities) return
    choosePriorities()
    navigate(ONBOARDING_ROUTES.priority, { replace: true })
  }, [needsPriorities, choosePriorities, navigate])

  const move = (next: number) => {
    setHasMoved(true)
    setIndex(next, orderKey)
  }

  // Records the order the step is in, once the questions show (the saved priorities are read by
  // then), so a later change of the priorities can move the step to the same question.
  const isShowing = saved.status === 'ready' && !needsPriorities
  useEffect(() => {
    if (!isShowing) return
    if (index !== savedIndex || indexOrder !== orderKey)
      setIndex(index, orderKey)
  }, [isShowing, index, savedIndex, indexOrder, orderKey, setIndex])

  // Answered before, but questions were added since (GET /api/me/status `survey_update_required`,
  // the same condition as here: submitted once, not completed now). The old answers are filled
  // in, so the notice explains why the survey is back and then opens the first new question.
  const needsUpdate =
    sync.status === 'ready' &&
    sync.revision > 0 &&
    !sync.surveyCompleted &&
    !isRetake
  const closeUpdateNotice = () => {
    markUpdateNoticeSeen()
    const next = firstUnanswered(answers, order)
    if (next !== null) move(next)
  }

  if (saved.status === 'failed') {
    return (
      <div className="relative isolate flex flex-1 flex-col items-center justify-center bg-question-surface md:rounded-[24px]">
        <ErrorState error={saved.error} onRetry={saved.retry} />
      </div>
    )
  }
  if (saved.status !== 'ready' || needsPriorities) {
    return (
      <FullPageLoading
        label="설문을 불러오고 있어요"
        hint="저장해 둔 답변이 있으면 이어서 할 수 있어요"
        priorities={onboarding.priorities}
      />
    )
  }

  return (
    <>
      <QuestionStep
        key={index}
        index={index}
        questionIndex={getQuestionIndex(order, index)}
        focusHeading={hasMoved}
        onMove={move}
      />
      {/* Not in Figma: the one-button dialog of 「링크 복사 완료!」 (1377:36531). */}
      {needsUpdate && !hasSeenUpdateNotice && (
        <ChoiceDialog
          title="새로운 질문이 추가됐어요"
          message={
            '이전 답변은 그대로 남아 있어요.\n새 질문에 답하고 설문을 다시 저장해주세요.'
          }
          confirmLabel="확인"
          triggerRef={noticeTriggerRef}
          onCancel={closeUpdateNotice}
          onConfirm={closeUpdateNotice}
        />
      )}
    </>
  )
}
