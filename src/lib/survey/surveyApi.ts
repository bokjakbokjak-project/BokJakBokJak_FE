import { apiRequest } from '../api/apiClient'
import { invalidResponse } from '../api/apiError'
import {
  asObject,
  readArray,
  readBoolean,
  readEnum,
  readNullableString,
  readNumber,
  readString,
} from '../api/parse'
import { NEXT_STEPS, type NextStep } from '../auth/authDto'

/**
 * The survey APIs: GET /api/surveys/current, GET /api/me/survey, PUT /api/me/survey. Field
 * names follow the Notion spec in snake_case, like the APIs already checked on the live server;
 * Swagger shows camelCase.
 */

export type SurveyOption = { optionCode: string; label: string }

export type SurveyQuestion = {
  questionCode: string
  questionNumber: number
  kind: 'HABIT' | 'TOLERANCE'
  topicCode: string
  categoryCode: string
  options: SurveyOption[]
}

export type SurveySchema = {
  categoryCodes: string[]
  /** Every question, in topic then question order. */
  questions: SurveyQuestion[]
}

export type ServerPriority = { categoryCode: string; rank: number }
export type ServerAnswer = { questionCode: string; optionCode: string }

export type MySurvey = {
  /** Send it back as `expected_revision`. 0 before the first submit. */
  revision: number
  surveyCompleted: boolean
  submittedAt: string | null
  priorities: ServerPriority[]
  /** The last completed submission. Empty before the first submit. */
  answers: ServerAnswer[]
}

export type SurveySaveRequest = {
  expected_revision: number
  priorities: { category_code: string; rank: number }[]
  answers: { question_code: string; option_code: string }[]
}

export type SurveySaveResult = {
  revision: number
  surveyCompleted: boolean
  submittedAt: string | null
  nextStep: NextStep
}

const QUESTION_KINDS = ['HABIT', 'TOLERANCE'] as const

function readRevision(data: Record<string, unknown>) {
  const revision = readNumber(data, 'revision')
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw invalidResponse('revision')
  }
  return revision
}

/** Sorted by `display_order`, so the order never depends on how the server lists them. */
function byDisplayOrder<T>(items: T[], order: (item: T) => number) {
  return [...items].sort((a, b) => order(a) - order(b))
}

export function parseSurveySchema(value: unknown): SurveySchema {
  const data = asObject(value)
  const categories = byDisplayOrder(
    readArray(data, 'categories').map((item) => {
      const category = asObject(item, 'categories')
      return {
        code: readString(category, 'category_code'),
        order: readNumber(category, 'display_order'),
      }
    }),
    (category) => category.order,
  )
  const topics = byDisplayOrder(
    readArray(data, 'topics').map((item) => {
      const topic = asObject(item, 'topics')
      return {
        topicCode: readString(topic, 'topic_code'),
        categoryCode: readString(topic, 'category_code'),
        order: readNumber(topic, 'display_order'),
        questions: readArray(topic, 'questions'),
      }
    }),
    (topic) => topic.order,
  )
  const questions = topics.flatMap(({ topicCode, categoryCode, questions }) =>
    byDisplayOrder(
      questions.map((item) => {
        const question = asObject(item, 'questions')
        return {
          questionCode: readString(question, 'question_code'),
          questionNumber: readNumber(question, 'question_number'),
          kind: readEnum(question, 'kind', QUESTION_KINDS),
          topicCode,
          categoryCode,
          options: readArray(question, 'options').map((option) => {
            const entry = asObject(option, 'options')
            return {
              optionCode: readString(entry, 'option_code'),
              label: readString(entry, 'label'),
            }
          }),
        }
      }),
      (question) => question.questionNumber,
    ),
  )
  return { categoryCodes: categories.map(({ code }) => code), questions }
}

function parsePriorities(data: Record<string, unknown>): ServerPriority[] {
  return readArray(data, 'priorities').map((item) => {
    const priority = asObject(item, 'priorities')
    return {
      categoryCode: readString(priority, 'category_code'),
      rank: readNumber(priority, 'rank'),
    }
  })
}

export function parseMySurvey(value: unknown): MySurvey {
  const data = asObject(value)
  return {
    revision: readRevision(data),
    surveyCompleted: readBoolean(data, 'survey_completed'),
    submittedAt: readNullableString(data, 'submitted_at'),
    priorities: parsePriorities(data),
    answers: readArray(data, 'answers').map((item) => {
      const answer = asObject(item, 'answers')
      return {
        questionCode: readString(answer, 'question_code'),
        optionCode: readString(answer, 'option_code'),
      }
    }),
  }
}

export function parseSurveySaveResult(value: unknown): SurveySaveResult {
  const data = asObject(value)
  return {
    revision: readRevision(data),
    surveyCompleted: readBoolean(data, 'survey_completed'),
    submittedAt: readNullableString(data, 'submitted_at'),
    nextStep: readEnum(data, 'next_step', NEXT_STEPS),
  }
}

export async function fetchSurveySchema(): Promise<SurveySchema> {
  return parseSurveySchema(await apiRequest('/api/surveys/current'))
}

export async function fetchMySurvey(): Promise<MySurvey> {
  return parseMySurvey(await apiRequest('/api/me/survey'))
}

export async function saveMySurvey(
  body: SurveySaveRequest,
): Promise<SurveySaveResult> {
  const data = await apiRequest('/api/me/survey', { method: 'PUT', body })
  const result = parseSurveySaveResult(data)
  // A 200 that does not report the survey as complete is not a success.
  if (!result.surveyCompleted) throw invalidResponse('survey_completed')
  return result
}
