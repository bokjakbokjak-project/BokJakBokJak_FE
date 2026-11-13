import { ANSWER_GROUPS, type AnswerSummaryCard } from '../answerSummary'
import { apiRequest } from '../api/apiClient'
import { invalidResponse } from '../api/apiError'
import { categoriesFromCodes } from '../api/categoryCodes'
import {
  asObject,
  readArray,
  readNullableNumber,
  readNullableString,
  readNumber,
  readString,
  readStringArray,
  type JsonObject,
} from '../api/parse'
import {
  CATEGORY_IDS,
  CATEGORY_SERVER_CODES,
  type CategoryId,
} from '../onboarding/categories'
import { LABEL_DIFFERENCES, SURVEY_CODES } from '../survey/surveyCodes'
import { QUESTION_TOPICS } from '../../pages/question/questionData'

/**
 * GET and PATCH /api/me/profile, and the answer part of GET /api/roommates/{id}/profile (세호
 * spec). Fields are snake_case like the other APIs checked on the live server; Swagger shows
 * camelCase.
 */

export type ProfileSummary = {
  nickname: string
  /** The server's age (spec: this year minus the birth year plus one). */
  age: number | null
  department: string
  /** Ranks 1 to 3 only, for the character. Not the user's full 3-5 priorities. */
  topCategories: (CategoryId | undefined)[]
  surveyRevision: number
  /**
   * The `상세 답변 요약` cards from `categories`: the profile owner's own habit and tolerance
   * answers. Null when the answers are not in the agreed shape, so the screen can leave them out
   * instead of failing as a whole.
   */
  cards: AnswerSummaryCard[] | null
}

export type MyProfile = ProfileSummary & { userId: number }

/** Spec: 1-20 characters after trimming. */
export const NICKNAME_MAX_LENGTH = 20

const CATEGORY_BY_SERVER_CODE = new Map(
  CATEGORY_IDS.map((id) => [CATEGORY_SERVER_CODES[id], id]),
)

/** Server topic code (`BEDTIME`) → FE topic id (`bedtime`), from the survey code table. */
const TOPIC_BY_SERVER_CODE = new Map(
  Object.entries(SURVEY_CODES).map(([topicId, codes]) => [
    codes.self.questionCode.replace(/_H$/, ''),
    topicId,
  ]),
)

/**
 * The screens keep the Figma copy (DE-7). The profile returns answers as the server's option
 * labels, so the few labels the server words differently are shown with their Figma text.
 */
function figmaLabel(questionCode: string, label: string) {
  return (
    LABEL_DIFFERENCES.find(
      (item) => item.questionCode === questionCode && item.server === label,
    )?.figma ?? label
  )
}

/**
 * `categories` of a profile as the answer cards, in the server's display order. A card keeps the
 * my page's Figma title and the survey's Figma question text; the answers are the profile owner's.
 */
export function parseProfileCards(value: unknown): AnswerSummaryCard[] | null {
  try {
    const categories = Array.isArray(value) ? value : null
    if (!categories) return null
    const cards: AnswerSummaryCard[] = []
    for (const entry of categories) {
      const category = asObject(entry, 'categories')
      const id = CATEGORY_BY_SERVER_CODE.get(
        readString(category, 'category_code'),
      )
      // A category the screens do not know has no icon or title, so it is left out.
      if (!id) continue
      const group = ANSWER_GROUPS.find((item) => item.category === id)
      const items = readArray(category, 'topics').map((item) => {
        const topic = asObject(item, 'topics')
        const topicCode = readString(topic, 'topic_code')
        const topicId = TOPIC_BY_SERVER_CODE.get(topicCode) ?? topicCode
        const feTopic = QUESTION_TOPICS.find(({ id }) => id === topicId)
        return {
          topicId,
          question: feTopic?.self.text ?? readString(topic, 'question'),
          mine: optionalAnswer(topic, 'habit_answer', `${topicCode}_H`),
          wanted: optionalAnswer(topic, 'tolerance_answer', `${topicCode}_T`),
        }
      })
      cards.push({
        category: id,
        title: group?.title ?? readString(category, 'name'),
        items,
      })
    }
    return cards
  } catch {
    return null
  }
}

function optionalAnswer(topic: JsonObject, key: string, questionCode: string) {
  const value = readNullableString(topic, key)
  if (value === null) {
    // The agreed shape always has both answers; anything else is not that shape.
    throw invalidResponse(key)
  }
  return figmaLabel(questionCode, value)
}

/** The shared part of both profile answers. */
export function parseProfileSummary(data: JsonObject): ProfileSummary {
  const surveyRevision = readNumber(data, 'survey_revision')
  if (!Number.isSafeInteger(surveyRevision) || surveyRevision < 0) {
    throw invalidResponse('survey_revision')
  }
  return {
    nickname: readString(data, 'nickname'),
    age: readNullableNumber(data, 'age'),
    department: readNullableString(data, 'department') ?? '',
    topCategories: categoriesFromCodes(readStringArray(data, 'top_categories')),
    surveyRevision,
    cards: parseProfileCards(data.categories),
  }
}

/** `data` of GET /api/me/profile. */
export function parseMyProfile(value: unknown): MyProfile {
  const data = asObject(value)
  return { userId: readNumber(data, 'user_id'), ...parseProfileSummary(data) }
}

/** GET /api/me/profile. 409 SURVEY_REQUIRED before the first survey. */
export async function fetchMyProfile(signal?: AbortSignal): Promise<MyProfile> {
  return parseMyProfile(await apiRequest('/api/me/profile', { signal }))
}

/** The trimmed nickname, or the reason it cannot be saved (same rule as the server). */
export function checkNickname(
  raw: string,
): { ok: true; nickname: string } | { ok: false; message: string } {
  const nickname = raw.trim()
  if (nickname.length === 0 || [...nickname].length > NICKNAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `닉네임은 1~${NICKNAME_MAX_LENGTH}자로 입력해주세요.`,
    }
  }
  return { ok: true, nickname }
}

/** PATCH /api/me/profile. Returns the saved nickname. Changes nothing else on the server. */
export async function saveNickname(nickname: string): Promise<string> {
  const data = asObject(
    await apiRequest('/api/me/profile', {
      method: 'PATCH',
      body: { nickname },
    }),
  )
  return readString(data, 'nickname')
}
