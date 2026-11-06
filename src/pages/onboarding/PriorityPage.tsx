import { useEffect } from 'react'
import CharacterPreview from '../../components/onboarding/CharacterPreview'
import OnboardingScreen from '../../components/onboarding/OnboardingScreen'
import PrimaryButton from '../../components/onboarding/PrimaryButton'
import PriorityChip from '../../components/onboarding/PriorityChip'
import ScreenTitle from '../../components/onboarding/ScreenTitle'
import {
  CATEGORY_CHIP_GAP,
  CATEGORY_LABELS,
  CATEGORY_ROW_WIDTH,
  CATEGORY_ROWS,
  type CategoryId,
} from '../../lib/onboarding/categories'
import { preloadCharacterAssets } from '../../lib/onboarding/character'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import {
  getRank,
  isPriorityComplete,
  togglePriority,
} from '../../lib/onboarding/priority'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { useStepNavigation } from '../../lib/onboarding/useStepNavigation'

// Slot width as a share of the Figma top row, capped at the exact Figma width. The small extra
// offsets rounding that would otherwise leave it just under the Figma width at 338px.
function slotWidth(id: CategoryId) {
  const { width } = CATEGORY_LABELS[id]
  const gaps = CATEGORY_CHIP_GAP * 2
  const chips = CATEGORY_ROW_WIDTH - gaps
  return `min(${width}px, calc((100% - ${gaps}px) * ${width} / ${chips} + 0.1px))`
}

export default function PriorityPage() {
  const { data, update } = useOnboarding()
  const go = useStepNavigation()
  const { priorities } = data
  const isComplete = isPriorityComplete(priorities)

  useEffect(preloadCharacterAssets, [])

  const handleToggle = (id: CategoryId) => {
    update({ priorities: togglePriority(priorities, id) })
  }

  return (
    <OnboardingScreen
      step={4}
      backTo={ONBOARDING_ROUTES.dormitory}
      footer={
        <PrimaryButton
          disabled={!isComplete}
          onClick={() => go(ONBOARDING_ROUTES.complete)}
        >
          완료하기
        </PrimaryButton>
      }
    >
      <ScreenTitle>
        내가 가장 중요하게 생각하는
        <br />
        생활습관을 선택해주세요
      </ScreenTitle>
      <div className="mt-[43px]">
        <CharacterPreview priorities={priorities} />
      </div>
      {/* Narrow screens give the chips 8px of the page margin. At 390px this changes nothing. */}
      <div className="mt-1.5 flex w-[calc(100%+16px)] max-w-[338px] flex-col gap-2 self-center">
        {CATEGORY_ROWS.map((row) => (
          <div
            key={row.join()}
            data-testid="priority-row"
            className="flex justify-center gap-2"
          >
            {row.map((id) => (
              <div
                key={id}
                data-testid={`priority-slot-${id}`}
                className="relative h-[38px] shrink-0"
                style={{ width: slotWidth(id) }}
              >
                <PriorityChip
                  id={id}
                  rank={getRank(priorities, id)}
                  allSelected={isComplete}
                  onToggle={handleToggle}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </OnboardingScreen>
  )
}
