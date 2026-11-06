import { Field, TextInput } from '../../components/onboarding/Field'
import OnboardingScreen from '../../components/onboarding/OnboardingScreen'
import PrimaryButton from '../../components/onboarding/PrimaryButton'
import ScreenTitle from '../../components/onboarding/ScreenTitle'
import {
  isSchoolStepComplete,
  useOnboarding,
} from '../../lib/onboarding/onboardingState'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { useStepNavigation } from '../../lib/onboarding/useStepNavigation'

export default function SchoolInfoPage() {
  const { data, update } = useOnboarding()
  const go = useStepNavigation()
  const isComplete = isSchoolStepComplete(data)

  return (
    <OnboardingScreen
      step={1}
      backTo={ONBOARDING_ROUTES.login}
      footer={
        <PrimaryButton
          aria-disabled={!isComplete}
          onClick={() => isComplete && go(ONBOARDING_ROUTES.profile)}
        >
          다음으로
        </PrimaryButton>
      }
    >
      <ScreenTitle>학교 정보를 등록해주세요</ScreenTitle>
      <div className="mt-[35px] flex flex-col gap-5">
        <Field label="학과" htmlFor="department">
          <TextInput
            id="department"
            value={data.department}
            placeholder="학과를 입력해주세요"
            onChange={(department) => update({ department })}
          />
        </Field>
        <Field label="학번" htmlFor="student-id">
          <TextInput
            id="student-id"
            value={data.studentId}
            placeholder="학번을 입력해주세요  ex ) 20241234"
            onChange={(studentId) => update({ studentId })}
          />
        </Field>
      </div>
    </OnboardingScreen>
  )
}
