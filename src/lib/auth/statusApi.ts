import { apiRequest } from '../api/apiClient'
import { invalidResponse } from '../api/apiError'
import { NEXT_STEPS, type NextStep } from './authDto'

/**
 * GET /api/me/status (BE PR #72, `MyStatusResponse`). Notion has no page for it yet, so the
 * fields follow the backend code: where the signed-in user should go when the app starts.
 */
export type MyStatus = {
  onboardingCompleted: boolean
  surveyCompleted: boolean
  /** Answered the survey before, but questions were added since, so it must be answered again. */
  surveyUpdateRequired: boolean
  nextStep: NextStep
  matched: boolean
  matchingId: number | null
}

type JsonObject = Record<string, unknown>

function readBoolean(data: JsonObject, key: string) {
  const value = data[key]
  if (typeof value !== 'boolean') throw invalidResponse(key)
  return value
}

export function parseMyStatus(value: unknown): MyStatus {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidResponse('data')
  }
  const data = value as JsonObject
  const nextStep = data.next_step
  if (!NEXT_STEPS.includes(nextStep as NextStep)) {
    throw invalidResponse('next_step')
  }
  const matchingId = data.matching_id ?? null
  if (
    matchingId !== null &&
    (typeof matchingId !== 'number' || !Number.isSafeInteger(matchingId))
  ) {
    throw invalidResponse('matching_id')
  }
  return {
    onboardingCompleted: readBoolean(data, 'onboarding_completed'),
    surveyCompleted: readBoolean(data, 'survey_completed'),
    surveyUpdateRequired: readBoolean(data, 'survey_update_required'),
    nextStep: nextStep as NextStep,
    matched: readBoolean(data, 'matched'),
    matchingId,
  }
}

/**
 * Optional: a server without this API (production before the backend deploys PR #72) must not
 * end a valid session, so a 401 after a successful refresh only fails this request.
 */
export async function fetchMyStatus(): Promise<MyStatus> {
  return parseMyStatus(
    await apiRequest('/api/me/status', { retried401: 'fail' }),
  )
}
