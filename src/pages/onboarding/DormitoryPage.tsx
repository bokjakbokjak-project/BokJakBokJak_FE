import { useEffect, useRef, useState } from 'react'
import alertCircle from '../../assets/icons/alert-circle.svg'
import DormitoryField from '../../components/onboarding/DormitoryField'
import { Field, TextInput } from '../../components/onboarding/Field'
import OnboardingScreen from '../../components/onboarding/OnboardingScreen'
import PrimaryButton from '../../components/onboarding/PrimaryButton'
import ScreenTitle from '../../components/onboarding/ScreenTitle'
import {
  isSameName,
  roomTypeNameFor,
  type DormitoryOption,
} from '../../lib/onboarding/dormitoryApi'
import {
  isDormitoryStepComplete,
  useOnboarding,
  type RoomCapacity,
} from '../../lib/onboarding/onboardingState'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { useStepNavigation } from '../../lib/onboarding/useStepNavigation'

// Figma note: start on 2인실, and touching 4인실 or 6인실 only shows the notice below.
const ROOM_OPTIONS: { value: RoomCapacity; label: string }[] = [
  { value: 2, label: '2인실' },
  { value: 4, label: '4인실' },
  { value: 6, label: '6인실' },
]

/** Shown for about 3 seconds, and restarted by each press. */
export const ROOM_NOTICE_MS = 3000

export default function DormitoryPage() {
  const { data, update } = useOnboarding()
  const go = useStepNavigation()
  const [isNoticeVisible, setIsNoticeVisible] = useState(false)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const isComplete = isDormitoryStepComplete(data)
  const { selectedDormitory } = data

  useEffect(() => () => clearTimeout(noticeTimerRef.current), [])

  // A dormitory picked earlier stops counting once the name is edited to another one.
  const changeDormitory = (dormitory: string) => {
    const isStillSelected =
      selectedDormitory !== null &&
      isSameName(selectedDormitory.name, dormitory)
    update(
      isStillSelected ? { dormitory } : { dormitory, selectedDormitory: null },
    )
  }

  const selectDormitory = (option: DormitoryOption) => {
    update({ selectedDormitory: option })
  }

  const handleRoomPress = (isSelected: boolean) => {
    clearTimeout(noticeTimerRef.current)
    setIsNoticeVisible(!isSelected)
    if (!isSelected) {
      noticeTimerRef.current = setTimeout(
        () => setIsNoticeVisible(false),
        ROOM_NOTICE_MS,
      )
    }
  }

  return (
    <OnboardingScreen
      step={3}
      backTo={ONBOARDING_ROUTES.profile}
      footer={
        <div className="relative">
          {/* Floats above the button, so showing it moves nothing. Taps pass through to the options. */}
          <div
            role="status"
            className="pointer-events-none absolute inset-x-0 bottom-[calc(100%+34px)]"
          >
            {isNoticeVisible && (
              <div className="flex min-h-[39px] items-center justify-center gap-0.5 rounded-[5px] border border-brand-cream3 bg-brand-cream2 px-2.5 py-2">
                <img src={alertCircle} alt="" className="size-5 shrink-0" />
                <p className="min-w-0 text-[14px] leading-[1.5] break-keep text-gray-500 min-[390px]:shrink-0 min-[390px]:whitespace-nowrap">
                  MVP로 아직 4인실과 6인실 매칭을 지원하지 않습니다.
                </p>
              </div>
            )}
          </div>
          <PrimaryButton
            aria-disabled={!isComplete}
            onClick={() => isComplete && go(ONBOARDING_ROUTES.priority)}
          >
            다음으로
          </PrimaryButton>
        </div>
      }
    >
      <ScreenTitle>기숙사 정보를 등록해주세요</ScreenTitle>
      {/* On short phones this keeps room for the notice above the button, so it never covers
          the room options and showing it moves nothing. The page scrolls instead. */}
      <div className="mt-[37px] flex flex-col gap-5 max-md:[@media(max-height:696px)]:pb-[78px]">
        <DormitoryField
          value={data.dormitory}
          onChange={changeDormitory}
          onSelect={selectDormitory}
        />
        {/* The Figma field stays, filled from 방 인원: the room type is the room size
            (`2인실`), decided on 2026-11-13. It takes no input. */}
        <Field label="방 타입" htmlFor="room-type">
          <TextInput
            id="room-type"
            value={
              data.roomCapacity === null
                ? ''
                : roomTypeNameFor(data.roomCapacity)
            }
            placeholder="합격한 기숙사 타입을 입력해주세요."
            readOnly
            onChange={() => {}}
          />
        </Field>
        <Field label="방 인원">
          <div className="flex gap-1.5">
            {ROOM_OPTIONS.map(({ value, label }) => {
              const isSelected = data.roomCapacity === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isSelected}
                  className={`flex h-[45px] min-w-0 flex-1 items-center justify-center rounded-[8px] border text-[14px] leading-[1.5] font-medium ${
                    isSelected
                      ? 'border-brand-brown1 bg-brand-brown1 text-white'
                      : 'border-brand-cream3 bg-brand-cream2 text-gray-500'
                  }`}
                  onClick={() => handleRoomPress(isSelected)}
                >
                  <span className="relative top-px">{label}</span>
                </button>
              )
            })}
          </div>
        </Field>
      </div>
    </OnboardingScreen>
  )
}
