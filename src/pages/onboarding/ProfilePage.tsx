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
  const isFemale = gender === 'female'
  const src = isFemale ? femaleIcon : maleIcon
  const mask = `url("${src}") center / contain no-repeat`
  return (
    <span
      aria-hidden="true"
      className={`relative shrink-0 ${isFemale ? 'size-[14.32px]' : 'size-5'}`}
    >
      <span
        className={`absolute bg-current ${isFemale ? '-inset-[0.84px]' : 'inset-0'}`}
        style={{ mask, WebkitMask: mask }}
      />
    </span>
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
      <div className="mt-12">
        <Field label="이름" htmlFor="name">
          <TextInput
            id="name"
            value={data.name}
            placeholder="이름을 입력해주세요"
            heightClassName="h-[46px]"
            onChange={(name) => update({ name })}
          />
        </Field>
      </div>
      <div className="mt-[19px]">
        <Field label="성별">
          <div className="grid grid-cols-2 gap-1.5">
            {GENDER_OPTIONS.map(({ value, label }) => {
              const isSelected = data.gender === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isSelected}
                  className={`flex h-14 items-center justify-center gap-2.5 rounded-[8px] p-2.5 text-[14px] leading-[1.5] font-medium ${
                    isSelected
                      ? 'bg-brand-brown1 text-white'
                      : 'border border-gray-100 bg-white text-gray-300'
                  }`}
                  onClick={() => update({ gender: value })}
                >
                  <GenderIcon gender={value} />
                  {label}
                </button>
              )
            })}
          </div>
        </Field>
      </div>
      <div className="mt-[26px]">
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
