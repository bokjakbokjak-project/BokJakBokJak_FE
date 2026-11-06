import CategoryCardContent from '../../components/onboarding/CategoryCard'
import CharacterPreview from '../../components/onboarding/CharacterPreview'
import OnboardingScreen from '../../components/onboarding/OnboardingScreen'
import PrimaryButton from '../../components/onboarding/PrimaryButton'
import RoomBackground from '../../components/onboarding/RoomBackground'
import { categoryCardClass } from '../../lib/onboarding/categories'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'

// Connection point: go to the situational survey for rank 1 once that screen exists.
// Nothing is saved yet, because the save API is not agreed (OPEN_QUESTIONS BE-6, BE-7).
function handleStart() {}

// 314px of the 342px character shows above the cards. See PriorityPage for the short window rule.
const STAGE_WIDTH = 'clamp(220px, calc((100dvh - 530px) * 302 / 314), 302px)'

export default function CompletePage() {
  const { data } = useOnboarding()
  const { priorities } = data

  return (
    <OnboardingScreen
      step={4}
      backTo={ONBOARDING_ROUTES.priority}
      fullBleed
      footer={<PrimaryButton onClick={handleStart}>시작하기!</PrimaryButton>}
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
      <div
        className="relative mx-auto aspect-[302/314] min-h-0 shrink-0"
        style={{ width: STAGE_WIDTH }}
      >
        <CharacterPreview priorities={priorities} />
      </div>
      <ul className="relative mx-auto flex w-full max-w-[390px] shrink-0 justify-center gap-3 px-6 pb-[50px]">
        {priorities.map((id) => (
          <li key={id} className="w-[min(106px,calc((100%-24px)/3+0.1px))]">
            <div className={categoryCardClass(true)}>
              <CategoryCardContent id={id} />
            </div>
          </li>
        ))}
      </ul>
    </OnboardingScreen>
  )
}
