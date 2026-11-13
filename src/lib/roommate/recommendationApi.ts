import { apiRequest } from '../api/apiClient'
import { categoriesFromCodes } from '../api/categoryCodes'
import {
  asObject,
  readArray,
  readBoolean,
  readEnum,
  readNullableNumber,
  readNullableString,
  readNumber,
  readString,
  readStringArray,
  type JsonObject,
} from '../api/parse'
import type { CategoryId } from '../onboarding/categories'

/**
 * The recommendation, analysis, lifestyle summary and chat request APIs (채희 spec 7.1 to 7.5).
 * Fields arrive in snake_case and become the camelCase models below at this boundary.
 */

export const RELATIONS = ['NONE', 'CHATTING', 'ENDED'] as const
export type Relation = (typeof RELATIONS)[number]

export type Recommendation = {
  userId: number
  nickname: string
  department: string
  /** The server's age. The rule it is counted by is not decided (spec 9.3), so it is shown as is. */
  age: number | null
  /** Rank 1 to 3 as the head, hand and body parts. An unknown code leaves its rank empty. */
  priorities: (CategoryId | undefined)[]
  /** 0 to 100. Null means too few answers, shown as `정보 부족`; 0 is a real 0%. */
  matchScore: number | null
  relation: Relation
}

export type RecommendationList = {
  /** In the server's order, which is kept. */
  recommendations: Recommendation[]
  totalCount: number
}

export type MatchAnalysis = {
  target: {
    userId: number
    nickname: string
    age: number | null
    department: string
    priorities: (CategoryId | undefined)[]
  }
  matchScore: number | null
  good: string[]
  adjust: string[]
  check: string[]
}

export type LifestyleSummary = {
  summary: string
  keywords: string[]
}

function parseRecommendation(value: unknown): Recommendation {
  const item = asObject(value, 'recommendations')
  return {
    userId: readNumber(item, 'user_id'),
    nickname: readString(item, 'nickname'),
    department: readNullableString(item, 'department') ?? '',
    age: readNullableNumber(item, 'age'),
    priorities: categoriesFromCodes(readStringArray(item, 'top_categories')),
    matchScore: readNullableNumber(item, 'match_score'),
    relation: readEnum(item, 'relation', RELATIONS),
  }
}

function parseList(data: JsonObject): RecommendationList {
  return {
    recommendations: readArray(data, 'recommendations').map(
      parseRecommendation,
    ),
    totalCount: readNumber(data, 'total_count'),
  }
}

/** The whole sorted list at once. `리스트 더보기` only shows more of it (spec 7.1). */
export async function getRecommendations(
  signal?: AbortSignal,
): Promise<RecommendationList> {
  return parseList(
    asObject(await apiRequest('/api/recommendations', { signal })),
  )
}

/** Recalculates the list. `changed: false` keeps the shown list (spec 7.2). */
export async function refreshRecommendations(): Promise<
  RecommendationList & { changed: boolean }
> {
  const data = asObject(
    await apiRequest('/api/recommendations/refresh', { method: 'POST' }),
  )
  return { ...parseList(data), changed: readBoolean(data, 'changed') }
}

/** May take a few seconds when the AI writes a new analysis (spec 7.3). */
export async function getMatchAnalysis(
  targetUserId: number,
  signal?: AbortSignal,
): Promise<MatchAnalysis> {
  const data = asObject(
    await apiRequest(`/api/recommendations/${targetUserId}/analysis`, {
      signal,
    }),
  )
  const target = asObject(data.target, 'target')
  return {
    target: {
      userId: readNumber(target, 'user_id'),
      nickname: readString(target, 'nickname'),
      age: readNullableNumber(target, 'age'),
      department: readNullableString(target, 'department') ?? '',
      priorities: categoriesFromCodes(
        readStringArray(target, 'top_categories'),
      ),
    },
    matchScore: readNullableNumber(data, 'match_score'),
    good: readStringArray(data, 'good_points'),
    adjust: readStringArray(data, 'adjust_points'),
    check: readStringArray(data, 'check_points'),
  }
}

/** One person's habits, loaded apart from the rest of the profile (spec 7.4). */
export async function getLifestyleSummary(
  userId: number,
  signal?: AbortSignal,
): Promise<LifestyleSummary> {
  const data = asObject(
    await apiRequest(`/api/users/${userId}/lifestyle-summary`, { signal }),
  )
  return {
    summary: readString(data, 'summary'),
    keywords: readStringArray(data, 'keywords'),
  }
}

/** Opens a CHATTING room right away; there is no accept step (spec 7.5). */
export async function requestChat(
  receiverId: number,
): Promise<{ matchingId: number }> {
  const data = asObject(
    await apiRequest('/api/matchings', {
      method: 'POST',
      body: { receiver_id: receiverId },
    }),
  )
  return { matchingId: readNumber(data, 'matching_id') }
}

export type RoommateProfile = {
  userId: number
  nickname: string
  age: number | null
  department: string
  priorities: (CategoryId | undefined)[]
}

/**
 * The card part of A's detail profile, `GET /api/roommates/{candidateId}/profile` (Swagger
 * `RoommateProfileResponse`). Its `categories` hold the survey questions and options but not
 * which option the candidate chose, so the answer cards are not built from it yet (roommate
 * OPEN_QUESTIONS RM-9).
 */
export async function getRoommateProfile(
  candidateId: number,
  signal?: AbortSignal,
): Promise<RoommateProfile> {
  const data = asObject(
    await apiRequest(`/api/roommates/${candidateId}/profile`, { signal }),
  )
  return {
    userId: readNumber(data, 'candidate_id'),
    nickname: readString(data, 'nickname'),
    age: readNullableNumber(data, 'age'),
    department: readNullableString(data, 'department') ?? '',
    priorities: categoriesFromCodes(readStringArray(data, 'top_categories')),
  }
}
