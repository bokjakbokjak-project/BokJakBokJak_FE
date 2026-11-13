import {
  CATEGORY_IDS,
  CATEGORY_SERVER_CODES,
  type CategoryId,
} from '../onboarding/categories'
import { MAX_PRIORITY_COUNT, MIN_PRIORITY_COUNT } from '../onboarding/priority'
import {
  QUESTION_COUNT,
  getQuestionStep,
} from '../../pages/question/questionData'
import type { QuestionAnswers } from '../../pages/question/questionState'
import { SURVEY_CODES } from './surveyCodes'
import type {
  ServerAnswer,
  ServerPriority,
  SurveySaveRequest,
  SurveySchema,
} from './surveyApi'

/**
 * Ties the FE survey screens (16 questions, answers kept as the chosen label per screen index) to
 * the server survey (`question_code`, `option_code`). Every pairing is checked against the
 * survey the server returns, so a renamed or missing code stops a save instead of sending a
 * wrong answer.
 */

/**
 * A survey that cannot be saved as it is. The message is shown to the user. `schema` means the
 * server survey does not match the screens, which only a server or screen change can fix;
 * `answers` means the user's answers are incomplete or invalid.
 */
export class SurveyMappingError extends Error {
  readonly reason: 'schema' | 'answers'

  constructor(message: string, reason: 'schema' | 'answers' = 'answers') {
    super(message)
    this.name = 'SurveyMappingError'
    this.reason = reason
  }
}

type MappedQuestion = {
  questionCode: string
  /** FE label → option code, or null when the server survey does not match this question. */
  codeByLabel: ReadonlyMap<string, string> | null
}

export type SurveyMapping = {
  /** By FE screen index, 0-15. */
  questions: readonly MappedQuestion[]
  /** Why a save cannot be sent, one line per problem. Empty when everything is tied. */
  problems: readonly string[]
}

/** Codes of FE question `index`. */
export function questionCodesAt(index: number) {
  const { topic, isSelf } = getQuestionStep(index)
  const codes = SURVEY_CODES[topic.id]
  if (!codes) throw new Error(`No survey codes for topic ${topic.id}`)
  return isSelf ? codes.self : codes.roommate
}

/**
 * Checks the server survey against the FE screens: every FE question and option code must exist
 * on the server with the same number of options, and every server question must be on screen.
 * A server still on the seven-option BEDTIME_H spec fails this and blocks the save.
 */
export function buildSurveyMapping(schema: SurveySchema): SurveyMapping {
  const problems: string[] = []
  const byCode = new Map(schema.questions.map((q) => [q.questionCode, q]))
  const known = new Set<string>()

  const questions = Array.from({ length: QUESTION_COUNT }, (_, index) => {
    const { questionCode, optionCodes } = questionCodesAt(index)
    known.add(questionCode)
    const labels = getQuestionStep(index).question.options
    const server = byCode.get(questionCode)
    if (!server) {
      problems.push(`${questionCode}: 서버 설문에 없는 문항이에요.`)
      return { questionCode, codeByLabel: null }
    }
    // The screen shows every option of the question, so the server must offer the same set.
    if (server.options.length !== labels.length) {
      problems.push(
        `${questionCode}: 화면의 선택지 ${labels.length}개와 서버의 선택지 ${server.options.length}개가 맞지 않아요.`,
      )
      return { questionCode, codeByLabel: null }
    }
    const serverCodes = new Set(server.options.map((o) => o.optionCode))
    const missing = optionCodes.filter((code) => !serverCodes.has(code))
    if (optionCodes.length !== labels.length || missing.length > 0) {
      problems.push(
        `${questionCode}: 서버에 없는 선택지 코드가 있어요 (${missing.join(', ')}).`,
      )
      return { questionCode, codeByLabel: null }
    }
    return {
      questionCode,
      codeByLabel: new Map(labels.map((label, i) => [label, optionCodes[i]])),
    }
  })

  // Every server question is required, so one the FE does not show cannot be answered.
  for (const { questionCode } of schema.questions) {
    if (!known.has(questionCode)) {
      problems.push(`${questionCode}: 화면에 없는 서버 문항이에요.`)
    }
  }
  return { questions, problems }
}

/** Question codes that block a save: the line of each problem starts with its code. */
export function blockedQuestionCodes(mapping: SurveyMapping) {
  return mapping.problems.map((problem) => problem.split(':')[0])
}

/** Whether FE question `index` cannot be tied to the server survey (such as BEDTIME_H). */
export function isQuestionBlocked(mapping: SurveyMapping, index: number) {
  return mapping.questions[index]?.codeByLabel === null
}

/** All 16 answers as the server expects them. Stops on any unanswered or untied question. */
export function toServerAnswers(
  answers: QuestionAnswers,
  mapping: SurveyMapping,
): SurveySaveRequest['answers'] {
  if (mapping.problems.length > 0) {
    throw new SurveyMappingError(
      `서버 설문과 화면의 문항이 맞지 않아 저장할 수 없어요 (${blockedQuestionCodes(mapping).join(', ')}). 서버 설문이 수정되면 저장할 수 있어요.`,
      'schema',
    )
  }
  return mapping.questions.map(({ questionCode, codeByLabel }, index) => {
    const label = answers[index]
    const optionCode = label === undefined ? undefined : codeByLabel?.get(label)
    if (!optionCode) {
      throw new SurveyMappingError('모든 문항에 답해주세요.')
    }
    return { question_code: questionCode, option_code: optionCode }
  })
}

/**
 * Saved answers as FE answers, matched by `question_code` and `option_code`. A code the screens
 * cannot show is left unanswered, so the user answers it again rather than seeing a wrong one.
 */
export function fromServerAnswers(
  saved: readonly ServerAnswer[],
  mapping: SurveyMapping,
): { answers: QuestionAnswers; unreadable: number } {
  const byQuestion = new Map(saved.map((a) => [a.questionCode, a.optionCode]))
  const answers: Record<number, string> = {}
  let unreadable = 0
  mapping.questions.forEach(({ questionCode, codeByLabel }, index) => {
    const optionCode = byQuestion.get(questionCode)
    if (optionCode === undefined) return
    const label = codeByLabel
      ? [...codeByLabel].find(([, code]) => code === optionCode)?.[0]
      : undefined
    if (label === undefined) unreadable += 1
    else answers[index] = label
  })
  return { answers, unreadable }
}

/** Priorities in rank order, as the server expects them (3-5 different categories, 1..n). */
export function toServerPriorities(
  priorities: readonly CategoryId[],
): SurveySaveRequest['priorities'] {
  if (
    priorities.length < MIN_PRIORITY_COUNT ||
    priorities.length > MAX_PRIORITY_COUNT ||
    new Set(priorities).size !== priorities.length
  ) {
    throw new SurveyMappingError(
      `생활습관 우선순위를 ${MIN_PRIORITY_COUNT}~${MAX_PRIORITY_COUNT}개 선택해주세요.`,
      'answers',
    )
  }
  return priorities.map((id, index) => ({
    category_code: CATEGORY_SERVER_CODES[id],
    rank: index + 1,
  }))
}

const CATEGORY_BY_SERVER_CODE = new Map(
  CATEGORY_IDS.map((id) => [CATEGORY_SERVER_CODES[id], id]),
)

/**
 * Saved priorities in rank order, or an empty list when they are missing or not a valid set
 * (unknown code, repeated category or rank, ranks not 1..n).
 */
export function fromServerPriorities(
  priorities: readonly ServerPriority[],
): CategoryId[] {
  const sorted = [...priorities].sort((a, b) => a.rank - b.rank)
  const ids = sorted.map(({ categoryCode }) =>
    CATEGORY_BY_SERVER_CODE.get(categoryCode),
  )
  const isValid =
    sorted.every(({ rank }, index) => rank === index + 1) &&
    ids.every((id) => id !== undefined) &&
    new Set(ids).size === ids.length &&
    ids.length >= MIN_PRIORITY_COUNT &&
    ids.length <= MAX_PRIORITY_COUNT
  return isValid ? (ids as CategoryId[]) : []
}
