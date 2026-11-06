import CharacterPreview from '../../components/onboarding/CharacterPreview'
import EmojiText from '../../components/onboarding/EmojiText'
import OnboardingScreen from '../../components/onboarding/OnboardingScreen'
import PrimaryButton from '../../components/onboarding/PrimaryButton'
import { CATEGORY_LABELS } from '../../lib/onboarding/categories'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { useStepNavigation } from '../../lib/onboarding/useStepNavigation'
import { QUESTION_ROUTES } from '../question/questionData'

export default function CompletePage() {
  const { data } = useOnboarding()
  const { priorities } = data
  const go = useStepNavigation()

  return (
    <OnboardingScreen
      step={4}
      backTo={ONBOARDING_ROUTES.priority}
      footer={
        // Nothing is saved yet, because the save API is not agreed (OPEN_QUESTIONS BE-6, BE-7).
        <PrimaryButton onClick={() => go(QUESTION_ROUTES.survey)}>
          시작하기
        </PrimaryButton>
      }
    >
      <div className="relative top-px -left-[0.5px] flex flex-col items-center gap-[5px] text-center">
        <h1 className="text-[22px] leading-[1.5] font-semibold whitespace-pre-wrap text-gray-black">
          {'등록완료! 복작복작과 함께 \n룸메이트를 찾아봐요!'}
        </h1>
        <p className="text-[13px] leading-[1.5] whitespace-nowrap text-gray-500">
          선택해주신 우선순위에 따라 설문조사를 진행할께요
        </p>
      </div>
      <div className="mt-[35.5px]">
        <CharacterPreview priorities={priorities} />
      </div>
      <ul className="-mx-1 mt-[22px] flex flex-wrap items-center justify-center gap-[5px]">
        {priorities.map((id, index) => (
          <li
            key={id}
            style={{ width: CATEGORY_LABELS[id].width }}
            className={`flex h-[38px] items-center justify-center rounded-[100px] border border-gray-100 text-[16px] leading-[1.5] font-medium whitespace-nowrap text-gray-black ${index < 2 ? 'bg-white' : 'bg-gray-50'}`}
          >
            <span className="relative top-px">
              <EmojiText
                emoji={CATEGORY_LABELS[id].emoji}
                text={CATEGORY_LABELS[id].label}
                emojiWidthClassName="w-4"
              />
            </span>
          </li>
        ))}
      </ul>
    </OnboardingScreen>
  )
}
