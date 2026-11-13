import { apiRequest } from '../api/apiClient'
import { invalidResponse } from '../api/apiError'
import { isServerMode } from '../api/config'
import { canUseTemporaryFlow } from './demoMode'
import { mockDormitoryApi } from './dormitoryApi.mock'

/**
 * GET and POST /api/dormitories. The server finds and registers dormitories in the signed-in
 * user's school only, so no school is sent. Field names are snake_case as in the Notion spec,
 * like the auth APIs that were checked against the live server; Swagger shows camelCase.
 */

export type RoomTypeOption = {
  id: number
  name: string
  capacity: number
}

export type DormitoryOption = {
  /** The server's group key for one dormitory in the school. */
  key: string
  name: string
  roomTypes: RoomTypeOption[]
}

export type DormitoryRegistration = {
  name: string
  roomTypeName: string
  capacity: number
}

export type DormitoryApi = {
  search: (keyword: string, signal?: AbortSignal) => Promise<DormitoryOption[]>
  /**
   * Registers a dormitory and room type together. The same tag again, even a concurrent one,
   * answers 200 with the existing IDs, so a retry cannot create a duplicate.
   */
  register: (input: DormitoryRegistration) => Promise<DormitoryOption>
}

/** Limit from the spec: keyword and dormitory name 1-80. */
export const DORMITORY_NAME_MAX_LENGTH = 80
/** MVP supports two-person rooms only (team decision; the server refuses other capacities). */
export const SUPPORTED_ROOM_CAPACITY = 2

/**
 * The room type is the room size, like the Notion example (`2인실`, capacity 2), not a building
 * name. Decided by the project owner on 2026-11-13.
 */
export function roomTypeNameFor(capacity: number) {
  return `${capacity}인실`
}

// ---------------------------------------------------------------------------------------------
// Response parsing

type JsonObject = Record<string, unknown>

function asObject(value: unknown, detail: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidResponse(detail)
  }
  return value as JsonObject
}

function readString(data: JsonObject, key: string) {
  const value = data[key]
  if (typeof value !== 'string') throw invalidResponse(key)
  return value
}

function readPositiveInteger(data: JsonObject, key: string) {
  const value = data[key]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw invalidResponse(key)
  }
  return value
}

function readArray(data: JsonObject, key: string) {
  const value = data[key]
  if (!Array.isArray(value)) throw invalidResponse(key)
  return value
}

function parseRoomType(value: unknown): RoomTypeOption {
  const data = asObject(value, 'room_types')
  return {
    id: readPositiveInteger(data, 'room_type_id'),
    name: readString(data, 'name'),
    capacity: readPositiveInteger(data, 'capacity'),
  }
}

/** A dormitory in the answers of both GET and POST /api/dormitories. */
export function parseDormitory(value: unknown): DormitoryOption {
  const data = asObject(value, 'dormitory')
  return {
    key: readString(data, 'dormitory_key'),
    name: readString(data, 'name'),
    roomTypes: readArray(data, 'room_types').map(parseRoomType),
  }
}

/** `data` of GET /api/dormitories. */
export function parseDormitoryList(value: unknown): DormitoryOption[] {
  return readArray(asObject(value, 'data'), 'dormitories').map(parseDormitory)
}

// ---------------------------------------------------------------------------------------------
// Matching

/**
 * Whether two names are the same, ignoring only leading and trailing spaces. The server
 * normalizes names on registration by rules the spec does not spell out, so the app reuses an
 * ID only for an exact name and leaves every other case to POST, which returns the existing ID
 * for a tag the server considers the same.
 */
export function isSameName(a: string, b: string) {
  return a.trim() === b.trim()
}

/** The one room type that matches the names exactly, or null when none or several match. */
export function findRoomType(
  dormitories: readonly DormitoryOption[],
  dormitoryName: string,
  roomTypeName: string,
  capacity: number,
): RoomTypeOption | null {
  const matches = dormitories
    .filter(({ name }) => isSameName(name, dormitoryName))
    .flatMap(({ roomTypes }) =>
      roomTypes.filter(
        (roomType) =>
          roomType.capacity === capacity &&
          isSameName(roomType.name, roomTypeName),
      ),
    )
  return matches.length === 1 ? matches[0] : null
}

/**
 * The room type that POST registered or reused. `room_types` may also list the dormitory's other
 * room types, so only the one entry with exactly this name and capacity is taken. None or several
 * is refused rather than guessed.
 */
export function pickRegisteredRoomType(
  dormitory: DormitoryOption,
  roomTypeName: string,
  capacity: number,
): RoomTypeOption {
  const matches = dormitory.roomTypes.filter(
    (roomType) =>
      roomType.capacity === capacity && isSameName(roomType.name, roomTypeName),
  )
  if (matches.length === 1) return matches[0]
  throw invalidResponse('room_type_id')
}

// ---------------------------------------------------------------------------------------------
// Implementations

const serverDormitoryApi: DormitoryApi = {
  search: async (keyword, signal) => {
    const query = new URLSearchParams({ keyword })
    const data = await apiRequest(`/api/dormitories?${query}`, { signal })
    return parseDormitoryList(data)
  },
  register: async ({ name, roomTypeName, capacity }) => {
    const data = await apiRequest('/api/dormitories', {
      method: 'POST',
      body: { name, room_type_name: roomTypeName, capacity },
    })
    return parseDormitory(data)
  },
}

// A production build in sample mode has no server and no sample data: search finds nothing,
// which leaves the plain Figma input. The sample flow saves nothing, so register is never called.
const offlineDormitoryApi: DormitoryApi = {
  search: async () => [],
  register: async () => {
    throw new Error('No dormitory server in sample mode.')
  },
}

/** Read on each call, so the mode follows the environment (and test stubs). */
export function getDormitoryApi(): DormitoryApi {
  if (isServerMode()) return serverDormitoryApi
  return canUseTemporaryFlow() ? mockDormitoryApi : offlineDormitoryApi
}

/** Whether search results come from somewhere real enough to show as a list. */
export function canShowDormitoryResults() {
  return isServerMode() || canUseTemporaryFlow()
}
