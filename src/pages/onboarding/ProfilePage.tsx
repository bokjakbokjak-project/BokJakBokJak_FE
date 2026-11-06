import { useRef, useState } from 'react'
import femaleIcon from '../../assets/icons/female.svg'
import maleIcon from '../../assets/icons/male.svg'
import {
  FIELD_BOX_CLASS,
  Field,
  TextInput,
} from '../../components/onboarding/Field'
import OnboardingScreen from '../../components/onboarding/OnboardingScreen'
import PrimaryButton from '../../components/onboarding/PrimaryButton'
import ScreenTitle from '../../components/onboarding/ScreenTitle'
import YearPickerSheet from '../../components/onboarding/YearPickerSheet'
import {
  isProfileStepComplete,
  useOnboarding,
  type Gender,
} from '../../lib/onboarding/onboardingState'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { useStepNavigation } from '../../lib/onboarding/useStepNavigation'

// Figma draws each icon in one state only, so the icon is used as a mask to recolor it.
function GenderIcon({ gender }: { gender: Gender }) {
  const src = gender === 'female' ? femaleIcon : maleIcon
  const mask = `url("${src}") center / contain no-repeat`
  return (
    <span
      aria-hidden="true"
      className="size-5 shrink-0 bg-current"
      style={{ mask, WebkitMask: mask }}
    />
  )
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
]

export default function ProfilePage() {
  const { data, update } = useOnboarding()
  const go = useStepNavigation()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const birthYearButtonRef = useRef<HTMLButtonElement>(null)
  const isComplete = isProfileStepComplete(data)

  return (
    <OnboardingScreen
      step={2}
      backTo={ONBOARDING_ROUTES.school}
      footer={
        <PrimaryButton
          aria-disabled={!isComplete}
          onClick={() => isComplete && go(ONBOARDING_ROUTES.dormitory)}
        >
          다음으로
        </PrimaryButton>
      }
    >
      <ScreenTitle>내 정보를 등록해주세요</ScreenTitle>
      <div className="mt-[35px] flex flex-col gap-5">
        <Field label="닉네임" htmlFor="name">
          <TextInput
            id="name"
            value={data.name}
            placeholder="닉네임을 입력해주세요"
            onChange={(name) => update({ name })}
          />
        </Field>
        <Field label="성별">
          <div className="grid grid-cols-2 gap-1.5">
            {GENDER_OPTIONS.map(({ value, label }) => {
              const isSelected = data.gender === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isSelected}
                  className={`flex h-14 items-center justify-center gap-[5px] rounded-[8px] p-2.5 text-[16px] leading-[1.5] font-medium ${
                    isSelected
                      ? 'bg-brand-brown1 text-white'
                      : 'border border-brand-cream3 bg-brand-cream2 text-brand-brown1'
                  }`}
                  onClick={() => update({ gender: value })}
                >
                  <GenderIcon gender={value} />
                  <span className="relative top-px">{label}</span>
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="출생년도">
          <button
            ref={birthYearButtonRef}
            type="button"
            className={`${FIELD_BOX_CLASS} flex h-[45px] items-center text-left ${data.birthYear ? 'text-gray-black' : 'text-gray-300'}`}
            onClick={() => setIsSheetOpen(true)}
          >
            {data.birthYear ?? '출생년도를 선택해주세요'}
          </button>
        </Field>
      </div>
      {isSheetOpen && (
        <YearPickerSheet
          initialYear={data.birthYear}
          triggerRef={birthYearButtonRef}
          onClose={() => setIsSheetOpen(false)}
          onSelect={(birthYear) => {
            update({ birthYear })
            setIsSheetOpen(false)
          }}
        />
      )}
    </OnboardingScreen>
  )
}
