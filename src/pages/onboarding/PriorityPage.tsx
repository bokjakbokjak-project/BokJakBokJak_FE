import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import alertCircle from '../../assets/icons/alert-circle.svg'
import infoIcon from '../../assets/icons/info.svg'
import panelDecor from '../../assets/onboarding/panel-decor.svg'
import CharacterPreview from '../../components/onboarding/CharacterPreview'
import MissionNotice from '../../components/onboarding/MissionNotice'
import OnboardingScreen from '../../components/onboarding/OnboardingScreen'
import PrimaryButton from '../../components/onboarding/PrimaryButton'
import PriorityChip from '../../components/onboarding/PriorityChip'
import RoomBackground from '../../components/onboarding/RoomBackground'
import { CATEGORY_ROWS, type CategoryId } from '../../lib/onboarding/categories'
import { preloadCharacterAssets } from '../../lib/onboarding/character'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import {
  getRank,
  isPriorityComplete,
  togglePriority,
} from '../../lib/onboarding/priority'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { useOnboardingSubmit } from '../../lib/onboarding/useOnboardingSubmit'
import { useStepNavigation } from '../../lib/onboarding/useStepNavigation'

export default function PriorityPage() {
  const { data, update, hasSeenMission, markMissionSeen } = useOnboarding()
  const go = useStepNavigation()
  const { priorities } = data
  const isComplete = isPriorityComplete(priorities)
  const infoButtonRef = useRef<HTMLButtonElement>(null)
  const [isMissionOpen, setIsMissionOpen] = useState(!hasSeenMission)
  const closeMission = useCallback(() => setIsMissionOpen(false), [])
  const { state, submit, clearError } = useOnboardingSubmit(() =>
    go(ONBOARDING_ROUTES.complete),
  )
  const isSaving = state.status === 'saving'
  const alertRef = useRef<HTMLDivElement>(null)
  const failure = state.status === 'failed' ? state.message : null
  // Height of the save failure notice, 0 while it is hidden. The character gives up this height.
  const [alertHeight, setAlertHeight] = useState(0)

  useEffect(preloadCharacterAssets, [])
  useEffect(markMissionSeen, [markMissionSeen])
  useEffect(() => {
    const node = alertRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setAlertHeight(node.offsetHeight))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  // On a short phone the button is pressed with the page scrolled down, so bring the notice in.
  useEffect(() => {
    if (failure) alertRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [failure])

  const handleToggle = (id: CategoryId) => {
    // The answers being saved stay as they are until the server answers.
    if (isSaving) return
    clearError()
    update({ priorities: togglePriority(priorities, id) })
  }

  return (
    <OnboardingScreen
      step={4}
      backTo={ONBOARDING_ROUTES.dormitory}
      fullBleed
      footer={
        <PrimaryButton
          disabled={!isComplete || isSaving}
          aria-busy={isSaving}
          onClick={() => void submit()}
        >
          {isSaving ? '저장 중...' : '완료하기'}
        </PrimaryButton>
      }
      headerAction={
        <button
          ref={infoButtonRef}
          type="button"
          aria-label="미션 안내 보기"
          className="absolute top-4 right-[25px] size-7 overflow-hidden rounded-full border-2 border-brand-brown3 bg-brand-beige1"
          onClick={() => setIsMissionOpen(true)}
        >
          <span className="absolute top-[29.17%] right-1/2 bottom-[29.64%] left-1/2">
            <span className="absolute inset-[-8.67%_-1px]">
              <img src={infoIcon} alt="" className="block size-full" />
            </span>
          </span>
        </button>
      }
    >
      <h1 className="sr-only">
        내가 가장 중요하게 생각하는 생활습관 5개의 순위를 매겨주세요
      </h1>
      <div className="relative flex flex-1 flex-col justify-end">
        {/* No Figma design for a failed save: it reuses the Figma snackbar style (575:1733) of
            the dormitory step, above the character. It never covers the character: while it
            shows, the character shrinks by its height, as the complete step does for its second
            card row (OPEN_QUESTIONS DE-9), so an 844px screen still fits without scrolling.
            Empty, it takes no height and nothing changes. */}
        <div
          ref={alertRef}
          role="alert"
          className={`relative z-30 mx-auto mb-auto w-full max-w-[390px] px-6 ${failure ? 'pb-2' : ''}`}
        >
          {state.status === 'failed' && (
            <div className="flex min-h-[39px] items-center justify-center gap-0.5 rounded-[5px] border border-brand-cream3 bg-brand-cream2 px-2.5 py-2">
              <img src={alertCircle} alt="" className="size-5 shrink-0" />
              <p className="min-w-0 text-[14px] leading-[1.5] break-keep text-gray-500">
                {state.message}
              </p>
            </div>
          )}
        </div>
        <RoomBackground className="absolute inset-x-0 -bottom-[35px] h-[155px]" />
        {/* 294px of the 342px character shows above the panel. On a short phone it shrinks with
            the free height, then the page scrolls. The PC frame is always 844px tall. */}
        <div
          className="relative mx-auto aspect-[302/294] min-h-0 w-[clamp(220px,calc((100dvh-550px-var(--alert-h))*302/294),302px)] shrink-0 md:w-[calc((294px-var(--alert-h))*302/294)]"
          style={{ '--alert-h': `${alertHeight}px` } as CSSProperties}
        >
          <CharacterPreview priorities={priorities} />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 h-[calc(361px+max(0px,calc(44px-env(safe-area-inset-bottom))))] rounded-t-[35px] bg-brand-cream1 shadow-[0_0_0_2px_var(--color-brand-brown2),0_-5px_0_2px_rgba(110,81,73,0.1)]">
        <img
          src={panelDecor}
          alt=""
          className="absolute top-[15px] left-1/2 h-[27px] w-[116.003px] max-w-none -translate-x-1/2"
        />
      </div>
      <div className="relative z-20 mx-auto flex w-full max-w-[390px] shrink-0 flex-col gap-[17px] px-6 pt-[73px] pb-[42px]">
        {CATEGORY_ROWS.map((row) => (
          <div
            key={row.join()}
            data-testid="priority-row"
            className="flex justify-center gap-3"
          >
            {row.map((id) => (
              <div
                key={id}
                data-testid={`priority-slot-${id}`}
                className="w-[min(106px,calc((100%-24px)/3+0.1px))] shrink-0"
              >
                <PriorityChip
                  id={id}
                  rank={getRank(priorities, id)}
                  onToggle={handleToggle}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      {isMissionOpen && (
        <MissionNotice triggerRef={infoButtonRef} onClose={closeMission} />
      )}
    </OnboardingScreen>
  )
}
