import type { CategoryId } from '../onboarding/categories'
import type { OnboardingData } from '../onboarding/onboardingState'

/**
 * The basic information every experience participant gets instead of the school, profile and
 * dormitory steps. They are experience settings, not anyone's details, and the screens never
 * present them as the participant's own (요청서 2, 게스트 공통 프로필 주의).
 */
export const EXPERIENCE_PROFILE: Partial<OnboardingData> = {
  name: '체험자',
  department: '체험학과',
  studentId: '00000000',
  gender: 'female',
  birthYear: 2004,
  dormitory: '체험 기숙사',
  roomCapacity: 2,
  selectedDormitory: null,
}

/** The filming run's example priorities (요청서 4.1 `촬영용 예시 불러오기`). */
export const FILM_PRIORITIES: readonly CategoryId[] = [
  'cleaning',
  'sleep-habit',
  'wake-alarm',
]
