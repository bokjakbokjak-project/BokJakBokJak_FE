import CategoryCardContent from '../../components/onboarding/CategoryCard'
import CharacterPreview from '../../components/onboarding/CharacterPreview'
import OnboardingScreen from '../../components/onboarding/OnboardingScreen'
import PrimaryButton from '../../components/onboarding/PrimaryButton'
import RankBadge from '../../components/onboarding/RankBadge'
import RoomBackground from '../../components/onboarding/RoomBackground'
import {
  CATEGORY_ROWS,
  categoryCardClass,
} from '../../lib/onboarding/categories'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import type { Rank } from '../../lib/onboarding/priority'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { useStepNavigation } from '../../lib/onboarding/useStepNavigation'
import { QUESTION_ROUTES } from '../question/questionData'

export default function CompletePage() {
  const { data } = useOnboarding()
  const { priorities } = data
  const rowLength = CATEGORY_ROWS[0].length
  const cards = priorities.map((id, index) => ({
    id,
    rank: (index + 1) as Rank,
  }))
  const cardRows = [cards.slice(0, rowLength), cards.slice(rowLength)].filter(
    (row) => row.length > 0,
  )
  const hasSecondRow = cardRows.length > 1
  const go = useStepNavigation()

  return (
    <OnboardingScreen
      step={4}
      backTo={ONBOARDING_ROUTES.priority}
      fullBleed
      footer={
        // Server mode saved the answers on the priority step before this screen opened.
        <PrimaryButton onClick={() => go(QUESTION_ROUTES.survey)}>
          시작하기!
        </PrimaryButton>
      }
    >
      <RoomBackground className="absolute inset-x-0 bottom-0 h-[439px]" />
      <div className="relative -left-[0.5px] flex flex-col items-center gap-[5px] px-6 text-center">
        <h1 className="relative top-px text-[22px] leading-[1.5] font-bold tracking-[0.44px] whitespace-pre-wrap text-brand-brown1">
          {'등록완료! 복작복작과 함께 \n룸메이트를 찾아봐요!'}
        </h1>
        <p className="relative top-px text-[13px] leading-[1.5] whitespace-nowrap text-gray-500">
          선택해주신 우선순위에 따라 설문조사를 진행할께요
        </p>
      </div>
      <div className="min-h-[53px] flex-1" />
      {/* 314px of the 342px character shows above the cards. See PriorityPage for the width.
          A second card row takes 99px, so the character shrinks by that height to keep the
          screen at 844px (OPEN_QUESTIONS DE-9). */}
      <div
        className={`relative mx-auto aspect-[302/314] min-h-0 shrink-0 ${hasSecondRow ? 'w-[clamp(160px,calc((100dvh-629px)*302/314),302px)] md:w-[206.8px]' : 'w-[clamp(220px,calc((100dvh-530px)*302/314),302px)] md:w-[302px]'}`}
      >
        <CharacterPreview priorities={priorities} />
      </div>
      {/* Rows of three and two, like the priority step. A wrapping row would break early,
          because each card is 0.1px wider than a third. */}
      <div className="relative mx-auto flex w-full max-w-[390px] shrink-0 flex-col gap-[17px] px-6 pb-[50px]">
        {cardRows.map((row) => (
          <ul key={row[0].rank} className="flex justify-center gap-3">
            {row.map(({ id, rank }) => (
              <li key={id} className="w-[min(106px,calc((100%-24px)/3+0.1px))]">
                <div className={categoryCardClass(true)}>
                  <CategoryCardContent id={id} />
                  <RankBadge rank={rank} />
                </div>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </OnboardingScreen>
  )
}
