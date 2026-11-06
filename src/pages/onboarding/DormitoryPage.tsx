import alertCircle from '../../assets/icons/alert-circle.svg'
import DormitoryField from '../../components/onboarding/DormitoryField'
import { Field, TextInput } from '../../components/onboarding/Field'
import OnboardingScreen from '../../components/onboarding/OnboardingScreen'
import PrimaryButton from '../../components/onboarding/PrimaryButton'
import ScreenTitle from '../../components/onboarding/ScreenTitle'
import {
  isDormitoryStepComplete,
  useOnboarding,
  type RoomCapacity,
} from '../../lib/onboarding/onboardingState'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { useStepNavigation } from '../../lib/onboarding/useStepNavigation'

// All options stay selectable: the supported range is undecided (OPEN_QUESTIONS PL-1).
const ROOM_OPTIONS: { value: RoomCapacity; label: string }[] = [
  { value: 2, label: '2인실' },
  { value: 4, label: '4인실' },
  { value: 6, label: '6인실' },
]

export default function DormitoryPage() {
  const { data, update } = useOnboarding()
  const go = useStepNavigation()
  const isComplete = isDormitoryStepComplete(data)

  return (
    <OnboardingScreen
      step={3}
      backTo={ONBOARDING_ROUTES.profile}
      footer={
        <PrimaryButton
          aria-disabled={!isComplete}
          onClick={() => isComplete && go(ONBOARDING_ROUTES.priority)}
        >
          다음으로
        </PrimaryButton>
      }
    >
      <ScreenTitle>기숙사 정보를 등록해주세요</ScreenTitle>
      <div className="mt-[50px] flex flex-col gap-5">
        <DormitoryField
          value={data.dormitory}
          onChange={(dormitory) => update({ dormitory })}
        />
        <Field label="방 타입" htmlFor="room-type">
          <TextInput
            id="room-type"
            value={data.roomType}
            placeholder="합격한 기숙사 타입을 입력해주세요."
            onChange={(roomType) => update({ roomType })}
          />
        </Field>
        <Field label="방 인원" labelClassName="text-brand-brown1">
          <div className="flex gap-1.5">
            {ROOM_OPTIONS.map(({ value, label }) => {
              const isSelected = data.roomCapacity === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isSelected}
                  className={`flex h-[45px] min-w-0 flex-1 items-center justify-center rounded-[8px] border p-2.5 text-[14px] leading-[1.5] ${
                    isSelected
                      ? 'border-brand-brown1 bg-brand-brown1 font-medium text-white'
                      : 'border-gray-100 bg-white font-normal text-brand-brown1'
                  }`}
                  onClick={() => update({ roomCapacity: value })}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Field>
        <div
          role="status"
          className="flex items-center justify-center gap-[5px] rounded-[5px] bg-gray-400 px-2.5 py-2"
        >
          <img src={alertCircle} alt="" className="size-5 shrink-0" />
          <p className="min-w-0 text-[14px] leading-[1.5] text-white min-[390px]:shrink-0 min-[390px]:whitespace-nowrap">
            MVP로 아직 4인실과 6인실 매칭을 지원하지 않습니다.
          </p>
        </div>
      </div>
    </OnboardingScreen>
  )
}
