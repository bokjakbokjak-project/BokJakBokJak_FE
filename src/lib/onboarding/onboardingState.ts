import { createContext, useContext } from 'react'
import type { CategoryId } from './categories'
import { isPriorityComplete } from './priority'
import { ONBOARDING_ROUTES } from './routes'

export type Gender = 'female' | 'male'
export type RoomCapacity = 2 | 4 | 6

export type OnboardingData = {
  department: string
  studentId: string
  name: string
  gender: Gender | null
  birthYear: number | null
  dormitory: string
  roomType: string
  roomCapacity: RoomCapacity | null
  priorities: CategoryId[]
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  department: '',
  studentId: '',
  name: '',
  gender: null,
  birthYear: null,
  dormitory: '',
  roomType: '',
  roomCapacity: null,
  priorities: [],
}

type OnboardingContextValue = {
  data: OnboardingData
  update: (patch: Partial<OnboardingData>) => void
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(
  null,
)

export function useOnboarding() {
  const value = useContext(OnboardingContext)
  if (!value) {
    throw new Error('useOnboarding must be used inside OnboardingProvider')
  }
  return value
}

const hasText = (value: string) => value.trim().length > 0

// Required fields are provisional; the backend contract is not agreed yet.
export function isSchoolStepComplete(data: OnboardingData) {
  return hasText(data.department) && hasText(data.studentId)
}

export function isProfileStepComplete(data: OnboardingData) {
  return hasText(data.name) && data.gender !== null && data.birthYear !== null
}

export function isDormitoryStepComplete(data: OnboardingData) {
  return (
    hasText(data.dormitory) &&
    hasText(data.roomType) &&
    data.roomCapacity !== null
  )
}

export function isPriorityStepComplete(data: OnboardingData) {
  return isPriorityComplete(data.priorities)
}

const STEPS = [
  { route: ONBOARDING_ROUTES.school, isComplete: isSchoolStepComplete },
  { route: ONBOARDING_ROUTES.profile, isComplete: isProfileStepComplete },
  { route: ONBOARDING_ROUTES.dormitory, isComplete: isDormitoryStepComplete },
  { route: ONBOARDING_ROUTES.priority, isComplete: isPriorityStepComplete },
]

export type GuardedRoute =
  | typeof ONBOARDING_ROUTES.profile
  | typeof ONBOARDING_ROUTES.dormitory
  | typeof ONBOARDING_ROUTES.priority
  | typeof ONBOARDING_ROUTES.complete

/** The earliest incomplete step before `route`, or null if `route` can be shown. */
export function getRequiredStepRoute(
  data: OnboardingData,
  route: GuardedRoute,
) {
  for (const step of STEPS) {
    if (step.route === route) return null
    if (!step.isComplete(data)) return step.route
  }
  return null
}
