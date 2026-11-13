import { apiRequest } from '../api/apiClient'
import { invalidResponse, isApiError } from '../api/apiError'
import { NEXT_STEPS, type NextStep } from '../auth/authDto'
import { CATEGORY_IDS, CATEGORY_SERVER_CODES } from './categories'
import {
  DORMITORY_NAME_MAX_LENGTH,
  SUPPORTED_ROOM_CAPACITY,
  findRoomType,
  pickRegisteredRoomType,
  roomTypeNameFor,
  type DormitoryApi,
  type DormitoryOption,
  type RoomTypeOption,
} from './dormitoryApi'
import type { OnboardingData } from './onboardingState'
import { MAX_PRIORITY_COUNT, MIN_PRIORITY_COUNT } from './priority'

/**
 * PUT /api/me/onboarding saves the four onboarding steps at once. The school is not part of it:
 * the server takes it from the signed-in account. Saving again is allowed until the first survey
 * is submitted; after that the server answers 409 ONBOARDING_ALREADY_SUBMITTED.
 *
 * Body names are snake_case as in the Notion spec, like the auth APIs that were checked against
 * the live server; Swagger shows camelCase.
 */
export type OnboardingRequest = {
  department: string
  student_number: string
  nickname: string
  gender: 'FEMALE' | 'MALE'
  birth_year: number
  room_type_id: number
  priorities: { category_code: string; rank: number }[]
}

export type OnboardingResult = {
  onboardingCompleted: boolean
  surveyCompleted: boolean
  nextStep: NextStep
}

/** Answers that cannot be sent as they are. Raised before any request. */
export class OnboardingInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OnboardingInputError'
  }
}

function requireText(value: string, message: string) {
  const text = value.trim()
  if (!text) throw new OnboardingInputError(message)
  return text
}

/** Maps the answers to the request. Ranks follow the selection order: index 0 is rank 1. */
export function buildOnboardingRequest(
  data: OnboardingData,
  roomTypeId: number,
): OnboardingRequest {
  const { priorities } = data
  if (
    priorities.length < MIN_PRIORITY_COUNT ||
    priorities.length > MAX_PRIORITY_COUNT ||
    new Set(priorities).size !== priorities.length ||
    priorities.some((id) => !CATEGORY_IDS.includes(id))
  ) {
    throw new OnboardingInputError(
      `생활습관을 ${MIN_PRIORITY_COUNT}~${MAX_PRIORITY_COUNT}개 선택해주세요.`,
    )
  }
  if (data.gender === null)
    throw new OnboardingInputError('성별을 선택해주세요.')
  if (data.birthYear === null) {
    throw new OnboardingInputError('출생년도를 선택해주세요.')
  }
  return {
    department: requireText(data.department, '학과를 입력해주세요.'),
    student_number: requireText(data.studentId, '학번을 입력해주세요.'),
    nickname: requireText(data.name, '닉네임을 입력해주세요.'),
    gender: data.gender === 'female' ? 'FEMALE' : 'MALE',
    birth_year: data.birthYear,
    room_type_id: roomTypeId,
    priorities: priorities.map((id, index) => ({
      category_code: CATEGORY_SERVER_CODES[id],
      rank: index + 1,
    })),
  }
}

/** `data` of PUT /api/me/onboarding. */
export function parseOnboardingResponse(value: unknown): OnboardingResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidResponse('data')
  }
  const data = value as Record<string, unknown>
  const { onboarding_completed, survey_completed, next_step } = data
  if (typeof onboarding_completed !== 'boolean') {
    throw invalidResponse('onboarding_completed')
  }
  if (typeof survey_completed !== 'boolean') {
    throw invalidResponse('survey_completed')
  }
  if (!NEXT_STEPS.includes(next_step as NextStep)) {
    throw invalidResponse('next_step')
  }
  return {
    onboardingCompleted: onboarding_completed,
    surveyCompleted: survey_completed,
    nextStep: next_step as NextStep,
  }
}

export async function saveOnboarding(
  body: OnboardingRequest,
): Promise<OnboardingResult> {
  const data = await apiRequest('/api/me/onboarding', { method: 'PUT', body })
  const result = parseOnboardingResponse(data)
  // A 200 that does not report the onboarding as saved is not a success.
  if (!result.onboardingCompleted) throw invalidResponse('onboarding_completed')
  return result
}

// ---------------------------------------------------------------------------------------------
// Room type

/**
 * The 2인실 of the dormitory picked earlier, while the typed name still matches it. Null when that
 * dormitory has no 2인실 yet, so the submit registers one.
 */
export function getConfirmedRoomType(
  data: OnboardingData,
): RoomTypeOption | null {
  if (!data.selectedDormitory || data.roomCapacity === null) return null
  return findRoomType(
    [data.selectedDormitory],
    data.dormitory,
    roomTypeNameFor(data.roomCapacity),
    data.roomCapacity,
  )
}

export type ResolvedRoomType = {
  dormitory: DormitoryOption
  roomType: RoomTypeOption
}

/**
 * Finds the ID of the typed dormitory's 2인실, registering `{name, room_type_name: "2인실",
 * capacity: 2}` only when the search has no exact match. The server also reuses an existing tag
 * on POST, so a name it normalizes to an existing one, or a race with another student
 * registering the same pair, still yields one ID.
 */
export async function resolveRoomType(
  data: OnboardingData,
  api: DormitoryApi,
  /** Throws to stop before the next request, such as when the session changed meanwhile. */
  checkpoint: () => void = () => {},
): Promise<ResolvedRoomType> {
  const name = requireText(data.dormitory, '기숙사를 입력해주세요.')
  if (data.roomCapacity !== SUPPORTED_ROOM_CAPACITY) {
    throw new OnboardingInputError('MVP에서는 2인실만 선택할 수 있어요.')
  }
  if (name.length > DORMITORY_NAME_MAX_LENGTH) {
    throw new OnboardingInputError(
      `기숙사 이름은 ${DORMITORY_NAME_MAX_LENGTH}자 이내로 입력해주세요.`,
    )
  }
  const capacity = SUPPORTED_ROOM_CAPACITY
  const roomTypeName = roomTypeNameFor(capacity)

  const found = await api.search(name)
  const existing = findRoomType(found, name, roomTypeName, capacity)
  if (existing) {
    const dormitory = found.find(({ roomTypes }) =>
      roomTypes.includes(existing),
    )
    if (dormitory) return { dormitory, roomType: existing }
  }

  checkpoint()
  const dormitory = await api.register({ name, roomTypeName, capacity })
  return {
    dormitory,
    roomType: pickRegisteredRoomType(dormitory, roomTypeName, capacity),
  }
}

// ---------------------------------------------------------------------------------------------
// Messages

const FIELD_LABELS: Record<string, string> = {
  department: '학과',
  student_number: '학번',
  studentNumber: '학번',
  nickname: '닉네임',
  gender: '성별',
  birth_year: '출생년도',
  birthYear: '출생년도',
  room_type_id: '방 타입',
  roomTypeId: '방 타입',
  priorities: '생활습관',
  name: '기숙사',
  room_type_name: '방 타입',
  roomTypeName: '방 타입',
  capacity: '방 인원',
  keyword: '기숙사',
}

export const SUBMIT_FAILED_MESSAGE = '저장하지 못했어요. 다시 시도해주세요.'

/** A message for a failed submit. A field error names the answer to fix. */
export function describeSubmitError(error: unknown): string {
  if (error instanceof OnboardingInputError) return error.message
  if (!isApiError(error)) return SUBMIT_FAILED_MESSAGE
  const [field] = Object.entries(error.fieldErrors)
  if (error.status === 400 && field) {
    const label = FIELD_LABELS[field[0]]
    return label ? `${label}: ${field[1]}` : field[1]
  }
  return error.message
}

/** The room type ID was refused, so the next attempt should look it up again. */
export function isRoomTypeRejected(error: unknown) {
  return (
    isApiError(error) &&
    (error.code === 'ROOM_TYPE_NOT_FOUND' ||
      error.code === 'UNSUPPORTED_ROOM_CAPACITY')
  )
}
