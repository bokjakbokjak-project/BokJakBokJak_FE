import { invalidResponse } from '../api/apiError'
import type { TokenPair } from './tokenStore'

/**
 * Response shapes of the auth APIs. The live server sends snake_case (checked 2026-11-13 against
 * https://bokjak-api.koreacentral.cloudapp.azure.com, matching the Notion spec), while its Swagger
 * schema shows camelCase names. Parsing checks every field this app relies on, so a changed
 * contract fails loudly instead of saving half a session.
 */

export const NEXT_STEPS = ['ONBOARDING', 'SURVEY', 'HOME'] as const
export type NextStep = (typeof NEXT_STEPS)[number]

export type SignInResult = {
  userId: number
  universityId: number
  onboardingCompleted: boolean
  surveyCompleted: boolean
  nextStep: NextStep
}

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidResponse('data')
  }
  return value as JsonObject
}

function readToken(data: JsonObject, key: string) {
  const value = data[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw invalidResponse(key)
  }
  return value
}

function readNumber(data: JsonObject, key: string) {
  const value = data[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalidResponse(key)
  }
  return value
}

function readBoolean(data: JsonObject, key: string) {
  const value = data[key]
  if (typeof value !== 'boolean') throw invalidResponse(key)
  return value
}

/** `data` of POST /api/auth/refresh, and the token part of POST /api/auth/login. */
export function parseTokenResponse(value: unknown): TokenPair {
  const data = asObject(value)
  const tokenType = data.token_type
  if (
    tokenType !== undefined &&
    (typeof tokenType !== 'string' || tokenType.toLowerCase() !== 'bearer')
  ) {
    throw invalidResponse('token_type')
  }
  return {
    accessToken: readToken(data, 'access_token'),
    refreshToken: readToken(data, 'refresh_token'),
  }
}

/** `data` of POST /api/auth/login. */
export function parseLoginResponse(value: unknown): {
  tokens: TokenPair
  result: SignInResult
} {
  const data = asObject(value)
  const nextStep = data.next_step
  if (!NEXT_STEPS.includes(nextStep as NextStep)) {
    throw invalidResponse('next_step')
  }
  return {
    tokens: parseTokenResponse(data),
    result: {
      userId: readNumber(data, 'user_id'),
      universityId: readNumber(data, 'university_id'),
      onboardingCompleted: readBoolean(data, 'onboarding_completed'),
      surveyCompleted: readBoolean(data, 'survey_completed'),
      nextStep: nextStep as NextStep,
    },
  }
}
