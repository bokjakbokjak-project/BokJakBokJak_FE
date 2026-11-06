import { useCallback, useEffect, useRef, useState } from 'react'
import infoIcon from '../../assets/icons/info.svg'
import panelPlus from '../../assets/icons/panel-plus.svg'
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
import { useStepNavigation } from '../../lib/onboarding/useStepNavigation'

// The character shows 294px of its 342px above the panel, and the panel covers the rest. On a
// short window it shrinks with the free height, down to a size that stays recognizable, so the
// bottom button stays on screen. Below that size the page scrolls.
const STAGE_WIDTH = 'clamp(220px, calc((100dvh - 550px) * 302 / 294), 302px)'

export default function PriorityPage() {
  const { data, update, hasSeenMission, markMissionSeen } = useOnboarding()
  const go = useStepNavigation()
  const { priorities } = data
  const isComplete = isPriorityComplete(priorities)
  const infoButtonRef = useRef<HTMLButtonElement>(null)
  const [isMissionOpen, setIsMissionOpen] = useState(!hasSeenMission)
  const closeMission = useCallback(() => setIsMissionOpen(false), [])

  useEffect(preloadCharacterAssets, [])
  useEffect(markMissionSeen, [markMissionSeen])

  const handleToggle = (id: CategoryId) => {
    update({ priorities: togglePriority(priorities, id) })
  }

  return (
    <OnboardingScreen
      step={4}
      backTo={ONBOARDING_ROUTES.dormitory}
      fullBleed
      footer={
        <PrimaryButton
          disabled={!isComplete}
          onClick={() => go(ONBOARDING_ROUTES.complete)}
        >
          완료하기
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
        내가 가장 중요하게 생각하는 생활습관을 선택해주세요
      </h1>
      <div className="relative flex flex-1 flex-col justify-end">
        <RoomBackground className="absolute inset-x-0 -bottom-[35px] h-[155px]" />
        <div
          className="relative mx-auto aspect-[302/294] min-h-0 shrink-0"
          style={{ width: STAGE_WIDTH }}
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
        <div className="relative mx-auto h-full w-full max-w-[390px]">
          <img
            src={panelPlus}
            alt=""
            className="absolute top-[17.25px] left-[23.25px] size-[21.5px] max-w-none"
          />
          <img
            src={panelPlus}
            alt=""
            className="absolute top-[17.25px] right-[23.25px] size-[21.5px] max-w-none"
          />
        </div>
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
