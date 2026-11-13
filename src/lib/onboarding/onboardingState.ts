import { createContext, useContext } from 'react'
import type { CategoryId } from './categories'
import type { DormitoryOption } from './dormitoryApi'
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
  /**
   * The room type follows from this (2 → `2인실`, decided 2026-11-13 after the Notion example),
   * so the 방 타입 field shows it and takes no input. MVP supports 2인실 only.
   */
  roomCapacity: RoomCapacity | null
  /**
   * The server dormitory, with its room types, that was picked from the results, matched the
   * typed name, or was registered. It only offers IDs: the room type ID is taken from it at
   * submit time and only while the typed name still matches (`getConfirmedRoomType`).
   */
  selectedDormitory: DormitoryOption | null
  priorities: CategoryId[]
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  department: '',
  studentId: '',
  name: '',
  gender: null,
  birthYear: null,
  dormitory: '',
  // Figma note: start on 2인실. 4인실 and 6인실 only show a notice for now.
  roomCapacity: 2,
  selectedDormitory: null,
  priorities: [],
}

type OnboardingContextValue = {
  data: OnboardingData
  update: (patch: Partial<OnboardingData>) => void
  /** The mission notice opens by itself only on the first visit to the priority step. */
  hasSeenMission: boolean
  markMissionSeen: () => void
  /** Server mode: the answers last saved with PUT /api/me/onboarding (`savedAnswersKey`). */
  savedAnswersKey: string | null
  markSaved: (key: string) => void
  /** A save is out. One runs at a time per session, whichever screen started it. */
  isSaving: boolean
  /** Takes the save lock. Returns false while another save is out. */
  beginSave: () => boolean
  endSave: () => void
}

/**
 * Identifies the answers a save sent. Any later change gives another key, so the complete screen
 * can tell whether what is on screen was saved.
 */
export function savedAnswersKey(data: OnboardingData) {
  return JSON.stringify([
    data.department,
    data.studentId,
    data.name,
    data.gender,
    data.birthYear,
    data.dormitory,
    data.roomCapacity,
    data.priorities,
  ])
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
  return hasText(data.dormitory) && data.roomCapacity !== null
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
