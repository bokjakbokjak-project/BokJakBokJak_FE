import { describe, expect, it } from 'vitest'
import {
  QUESTION_COUNT,
  QUESTION_TOPICS,
  getQuestionStep,
} from '../../pages/question/questionData'
import {
  FIRST_OPTION_ANSWERS,
  FIVE_BEDTIME_H_OPTIONS,
  SPEC_BEDTIME_H_OPTIONS,
  mySurveyData,
  schemaData,
} from '../../test/surveyFixture'
import { ApiError } from '../api/apiError'
import {
  parseMySurvey,
  parseSurveySaveResult,
  parseSurveySchema,
} from './surveyApi'
import { LABEL_DIFFERENCES, SURVEY_CODES } from './surveyCodes'
import {
  SurveyMappingError,
  buildSurveyMapping,
  fromServerAnswers,
  fromServerPriorities,
  questionCodesAt,
  toServerAnswers,
  toServerPriorities,
} from './surveyMapping'

/** The older Notion spec: BEDTIME_H with seven options. */
const specSchema = () =>
  parseSurveySchema(schemaData({ bedtime: SPEC_BEDTIME_H_OPTIONS }))
/** The live server survey of 2026-11-14 (the fixture default, checked against the response). */
const fiveOptionSchema = () => parseSurveySchema(schemaData())

/** The first FE option of every question, as the FE keeps answers (label per screen index). */
const firstOptions = () =>
  Object.fromEntries(
    Array.from({ length: QUESTION_COUNT }, (_, index) => [
      index,
      getQuestionStep(index).question.options[0],
    ]),
  )

describe('survey code table', () => {
  it('covers every FE topic with one code per FE option', () => {
    expect(Object.keys(SURVEY_CODES).sort()).toEqual(
      QUESTION_TOPICS.map(({ id }) => id).sort(),
    )
    for (let index = 0; index < QUESTION_COUNT; index += 1) {
      const { optionCodes } = questionCodesAt(index)
      const labels = getQuestionStep(index).question.options
      expect(optionCodes).toHaveLength(labels.length)
      expect(new Set(optionCodes).size).toBe(optionCodes.length)
    }
  })

  it('uses 16 different question codes, a habit and a tolerance code per topic', () => {
    const codes = Array.from(
      { length: QUESTION_COUNT },
      (_, index) => questionCodesAt(index).questionCode,
    )
    expect(new Set(codes).size).toBe(QUESTION_COUNT)
    codes.forEach((code, index) =>
      expect(code.endsWith(index % 2 === 0 ? '_H' : '_T')).toBe(true),
    )
  })

  it('ties the five Figma bedtime options to the live server codes', () => {
    expect(SURVEY_CODES.bedtime.self).toEqual({
      questionCode: 'BEDTIME_H',
      optionCodes: FIVE_BEDTIME_H_OPTIONS.map(([code]) => code),
    })
    // Each Figma option sits next to the code whose live label is the same text.
    expect(getQuestionStep(2).question.options).toEqual(
      FIVE_BEDTIME_H_OPTIONS.map(([, label]) => label),
    )
  })

  it('lists every Figma label that differs from the live server label', () => {
    const schema = fiveOptionSchema()
    const differences: (typeof LABEL_DIFFERENCES)[number][] = []
    for (let index = 0; index < QUESTION_COUNT; index += 1) {
      const { questionCode, optionCodes } = questionCodesAt(index)
      const server = schema.questions.find(
        (q) => q.questionCode === questionCode,
      )!
      getQuestionStep(index).question.options.forEach((figma, i) => {
        const label = server.options.find(
          (o) => o.optionCode === optionCodes[i],
        )!.label
        if (label !== figma) {
          differences.push({
            questionCode,
            optionCode: optionCodes[i],
            figma,
            server: label,
          })
        }
      })
    }
    expect(differences).toEqual(LABEL_DIFFERENCES)
  })
})

describe('survey parsing', () => {
  it('reads the snake_case survey in display order', () => {
    const raw = schemaData()
    raw.topics.reverse()
    raw.topics.forEach((topic) => topic.questions.reverse())

    const schema = parseSurveySchema(raw)

    expect(schema.categoryCodes).toEqual([
      'SLEEP_HABITS',
      'SLEEP_SCHEDULE',
      'CLEANING',
      'PERSONAL_HYGIENE',
      'SMOKING',
    ])
    expect(schema.questions).toHaveLength(16)
    expect(schema.questions.map((q) => q.questionNumber)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    )
    expect(schema.questions[2]).toMatchObject({
      questionCode: 'BEDTIME_H',
      kind: 'HABIT',
      topicCode: 'BEDTIME',
      categoryCode: 'SLEEP_SCHEDULE',
    })
    expect(schema.questions[2].options).toHaveLength(5)
  })

  it('refuses the camelCase shape that Swagger shows', () => {
    expect(() =>
      parseSurveySchema({
        categories: [
          { categoryCode: 'SMOKING', name: '흡연', displayOrder: 1 },
        ],
        topics: [],
      }),
    ).toThrow(ApiError)
    expect(() =>
      parseMySurvey({
        revision: 0,
        surveyCompleted: false,
        submittedAt: null,
        priorities: [],
        answers: [],
      }),
    ).toThrow(ApiError)
  })

  it('reads a saved survey and an empty one before the first submit', () => {
    expect(parseMySurvey(mySurveyData())).toEqual({
      revision: 0,
      surveyCompleted: false,
      submittedAt: null,
      priorities: [],
      answers: [],
    })
    expect(
      parseMySurvey(
        mySurveyData({
          revision: 3,
          completed: true,
          priorities: [{ category_code: 'SMOKING', rank: 1 }],
          answers: [{ question_code: 'SMOKING_H', option_code: 'NON_SMOKER' }],
        }),
      ),
    ).toMatchObject({
      revision: 3,
      surveyCompleted: true,
      priorities: [{ categoryCode: 'SMOKING', rank: 1 }],
      answers: [{ questionCode: 'SMOKING_H', optionCode: 'NON_SMOKER' }],
    })
  })

  it('refuses a negative or fractional revision and an unknown next step', () => {
    expect(() => parseMySurvey(mySurveyData({ revision: -1 }))).toThrow(
      ApiError,
    )
    expect(() =>
      parseSurveySaveResult({
        revision: 1.5,
        survey_completed: true,
        submitted_at: null,
        next_step: 'HOME',
      }),
    ).toThrow(ApiError)
    expect(() =>
      parseSurveySaveResult({
        revision: 1,
        survey_completed: true,
        submitted_at: null,
        next_step: 'PROFILE',
      }),
    ).toThrow(ApiError)
  })
})

describe('BEDTIME_H options', () => {
  it('cannot be tied while the server sends the seven spec options', () => {
    const mapping = buildSurveyMapping(specSchema())

    expect(mapping.problems).toEqual([
      'BEDTIME_H: 화면의 선택지 5개와 서버의 선택지 7개가 맞지 않아요.',
    ])
    expect(() => toServerAnswers(firstOptions(), mapping)).toThrow(
      SurveyMappingError,
    )
  })

  it('maps every Figma option to its live code', () => {
    const mapping = buildSurveyMapping(fiveOptionSchema())

    expect(mapping.problems).toEqual([])
    FIVE_BEDTIME_H_OPTIONS.forEach(([code, label]) =>
      expect(
        toServerAnswers({ ...firstOptions(), 2: label }, mapping)[2],
      ).toEqual({ question_code: 'BEDTIME_H', option_code: code }),
    )
  })

  it('blocks a five-option BEDTIME_H whose codes are not the expected ones', () => {
    const otherCodes = FIVE_BEDTIME_H_OPTIONS.map(
      ([code, label], i) =>
        [i === 1 ? 'FROM_22_TO_23' : code, label] as [string, string],
    )
    const mapping = buildSurveyMapping(
      parseSurveySchema(schemaData({ bedtime: otherCodes })),
    )
    expect(mapping.problems).toEqual([
      'BEDTIME_H: 서버에 없는 선택지 코드가 있어요 (FROM_22_TO_24).',
    ])
  })
})

describe('answers', () => {
  it('sends all 16 answers by question and option code', () => {
    const mapping = buildSurveyMapping(fiveOptionSchema())
    expect(toServerAnswers(firstOptions(), mapping)).toEqual(
      FIRST_OPTION_ANSWERS,
    )
  })

  it('does not depend on the order of the server options', () => {
    const raw = schemaData({ bedtime: FIVE_BEDTIME_H_OPTIONS })
    raw.topics.forEach((topic) =>
      topic.questions.forEach((question) => question.options.reverse()),
    )
    const mapping = buildSurveyMapping(parseSurveySchema(raw))
    expect(toServerAnswers(firstOptions(), mapping)).toEqual(
      FIRST_OPTION_ANSWERS,
    )
  })

  it('maps the Figma labels to their codes, including one worded differently on the server', () => {
    const mapping = buildSurveyMapping(fiveOptionSchema())
    const answers = toServerAnswers(
      {
        ...firstOptions(),
        7: '주 2~3회 한다',
        14: '흡연자이지만 기숙사에서는 자제할 예정이다',
      },
      mapping,
    )
    expect(answers[7]).toEqual({
      question_code: 'FLOOR_CLEAN_T',
      option_code: 'TWO_THREE_WEEKLY_MIN',
    })
    expect(answers[14]).toEqual({
      question_code: 'SMOKING_H',
      option_code: 'QUIT_IN_DORM',
    })
  })

  it('refuses to send while a question is unanswered', () => {
    const mapping = buildSurveyMapping(fiveOptionSchema())
    const answers: Record<number, string> = { ...firstOptions() }
    delete answers[9]
    expect(() => toServerAnswers(answers, mapping)).toThrow(
      '모든 문항에 답해주세요.',
    )
  })

  it('refuses to send when the server misses a code or has a question the screens lack', () => {
    const renamed = schemaData()
    renamed.topics[0].questions[0].options[4].option_code = 'NOT_SURE'
    expect(buildSurveyMapping(parseSurveySchema(renamed)).problems).toEqual([
      'SLEEP_HABITS_H: 서버에 없는 선택지 코드가 있어요 (UNKNOWN).',
    ])

    const fewer = schemaData()
    fewer.topics[0].questions[0].options.pop()
    expect(buildSurveyMapping(parseSurveySchema(fewer)).problems).toEqual([
      'SLEEP_HABITS_H: 화면의 선택지 5개와 서버의 선택지 4개가 맞지 않아요.',
    ])

    const extra = schemaData({ bedtime: FIVE_BEDTIME_H_OPTIONS })
    extra.topics[0].questions.push({
      ...extra.topics[0].questions[0],
      question_code: 'NEW_Q',
      question_number: 99,
    })
    expect(buildSurveyMapping(parseSurveySchema(extra)).problems).toEqual([
      'NEW_Q: 화면에 없는 서버 문항이에요.',
    ])
  })

  it('restores saved answers by code, whatever their order', () => {
    const mapping = buildSurveyMapping(fiveOptionSchema())
    const saved = [...FIRST_OPTION_ANSWERS]
      .reverse()
      .map(({ question_code, option_code }) => ({
        questionCode: question_code,
        optionCode: option_code,
      }))

    expect(fromServerAnswers(saved, mapping)).toEqual({
      answers: firstOptions(),
      unreadable: 0,
    })
  })

  it('leaves a saved code the screens cannot show unanswered', () => {
    const mapping = buildSurveyMapping(specSchema())
    const { answers, unreadable } = fromServerAnswers(
      [
        { questionCode: 'BEDTIME_H', optionCode: 'FROM_22_TO_23' },
        { questionCode: 'SMOKING_T', optionCode: 'ANY_OK' },
      ],
      mapping,
    )
    expect(answers).toEqual({ 15: '흡연 여부는 상관없다' })
    expect(unreadable).toBe(1)
  })
})

describe('priorities', () => {
  it('sends ranks 1..n in the chosen order', () => {
    expect(toServerPriorities(['smoking', 'cleaning', 'sleep-habit'])).toEqual([
      { category_code: 'SMOKING', rank: 1 },
      { category_code: 'CLEANING', rank: 2 },
      { category_code: 'SLEEP_HABITS', rank: 3 },
    ])
  })

  it('refuses fewer than three, more than five, or a repeated category', () => {
    expect(() => toServerPriorities(['smoking', 'cleaning'])).toThrow(
      SurveyMappingError,
    )
    expect(() =>
      toServerPriorities(['smoking', 'cleaning', 'cleaning']),
    ).toThrow(SurveyMappingError)
  })

  it('reads saved priorities by rank, and nothing from an invalid set', () => {
    expect(
      fromServerPriorities([
        { categoryCode: 'CLEANING', rank: 2 },
        { categoryCode: 'SMOKING', rank: 1 },
        { categoryCode: 'SLEEP_SCHEDULE', rank: 3 },
      ]),
    ).toEqual(['smoking', 'cleaning', 'wake-alarm'])
    expect(
      fromServerPriorities([
        { categoryCode: 'SMOKING', rank: 1 },
        { categoryCode: 'CLEANING', rank: 3 },
        { categoryCode: 'SLEEP_HABITS', rank: 4 },
      ]),
    ).toEqual([])
    expect(
      fromServerPriorities([
        { categoryCode: 'SMOKING', rank: 1 },
        { categoryCode: 'UNKNOWN', rank: 2 },
        { categoryCode: 'CLEANING', rank: 3 },
      ]),
    ).toEqual([])
    expect(fromServerPriorities([])).toEqual([])
  })
})
