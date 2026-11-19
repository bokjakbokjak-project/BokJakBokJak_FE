import { Navigate, useNavigate } from 'react-router'
import CharacterPreview from '../../components/onboarding/CharacterPreview'
import PrimaryButton from '../../components/onboarding/PrimaryButton'
import RoomBackground from '../../components/onboarding/RoomBackground'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import {
  getTestProfileConfig,
  isUserTestEnabled,
  testerName,
} from '../../lib/userTest/config'
import { DEMO_ENTRY_ROUTE } from '../../lib/userTest/routes'
import { useStartLiveSurvey } from '../../lib/userTest/useStartLiveSurvey'
import { testOnboardingPatch } from '../../lib/userTest/testProfile'
import {
  getParticipantId,
  setExperienceMode,
} from '../../lib/userTest/userTestStore'

export const SHARED_INFO_NOTICE =
  '사용자 테스트에서는 나이·성별·학교·기숙사 정보가 공통값으로 설정됩니다. 생활습관은 본인의 기준으로 답해주세요.'
export const FEEDBACK_NOTICE =
  '체험 중 짧은 의견을 요청하며, 답변은 서비스 개선에 활용됩니다. 건너뛸 수 있어요.'

/**
 * The user test's first screen after sign-in (not in Figma; it reuses the onboarding screen
 * style). It says which information is shared, asks for short feedback, and offers the two
 * ways in: the real survey, or browsing with example data.
 */
export default function UserTestStartPage() {
  const navigate = useNavigate()
  const startLiveSurvey = useStartLiveSurvey()
  const participant = getParticipantId()

  if (!isUserTestEnabled()) {
    return <Navigate to={ONBOARDING_ROUTES.school} replace />
  }
  if (participant === null) {
    return <Navigate to={ONBOARDING_ROUTES.login} replace />
  }

  const config = getTestProfileConfig()

  const startSurvey = () => {
    const patch = testOnboardingPatch()
    if (patch) startLiveSurvey(patch)
  }

  const browse = () => {
    setExperienceMode('demo')
    navigate(DEMO_ENTRY_ROUTE)
  }

  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden bg-brand-cream1 pt-[max(47px,env(safe-area-inset-top))] md:rounded-[24px]">
      <RoomBackground className="absolute inset-x-0 bottom-0 -z-10 h-[439px]" />
      <main className="flex flex-1 flex-col px-6 pt-8">
        <p className="text-[13px] leading-[1.5] font-semibold text-brand-brown3">
          사용자 테스트
        </p>
        <h1 className="mt-1 text-[22px] leading-[1.5] font-bold tracking-[0.44px] break-keep text-brand-brown1">
          {testerName(participant)}님, 복작복작을 체험해 보세요
        </h1>
        <div className="mt-4 flex flex-col gap-2 rounded-[12px] border border-brand-cream3 bg-brand-cream2 px-4 py-3.5 text-[14px] leading-[1.5] font-medium break-keep text-gray-500">
          <p>{SHARED_INFO_NOTICE}</p>
          <p>{FEEDBACK_NOTICE}</p>
        </div>
        {config.status === 'missing' && (
          // A setup problem for the test team, not the tester: the survey cannot be saved
          // without the shared values, so only browsing is offered.
          <div
            role="alert"
            className="mt-3 rounded-[12px] border border-chat-danger bg-white px-4 py-3 text-[13px] leading-[1.5] break-keep text-chat-danger"
          >
            <p className="font-semibold">
              테스트 공통 정보가 설정되지 않아 설문을 시작할 수 없어요.
            </p>
            <p className="mt-1">확인할 설정: {config.problems.join(', ')}</p>
          </div>
        )}
        <div className="mx-auto mt-auto w-[200px]">
          <CharacterPreview priorities={[]} showRug={false} />
        </div>
      </main>
      <div className="flex flex-col gap-2 px-6 pt-4 pb-[max(28px,env(safe-area-inset-bottom))]">
        <PrimaryButton
          disabled={config.status !== 'ready'}
          onClick={startSurvey}
        >
          설문 진행하기
        </PrimaryButton>
        <button
          type="button"
          className="flex h-[52px] w-full items-center justify-center rounded-[10px] border-[1.5px] border-brand-brown3 bg-white text-[16px] leading-[1.5] font-semibold text-brand-brown3"
          onClick={browse}
        >
          시간이 없어서 그냥 둘러볼게요
        </button>
      </div>
    </div>
  )
}
