/**
 * Server codes of the survey screens. The screens keep the Figma copy (questionData.ts,
 * OPEN_QUESTIONS DE-7), so each FE question and option is tied to its `question_code` and
 * `option_code` here, by name, never by position in a server array.
 *
 * Codes follow the live server's `GET /api/surveys/current`, read on 2026-11-14 (the Notion
 * copies are not synced and still list the older seven BEDTIME_H options). The screens show the
 * Figma copy, decided by the project owner on 2026-11-14 (DE-7); where the live label differs,
 * the pair is listed in `LABEL_DIFFERENCES` below. Every code is checked against the survey the
 * server returns at run time, so a changed code stops a save instead of sending a wrong answer.
 */

export type QuestionCodes = {
  questionCode: string
  /** The option code of each FE option, in FE order. */
  optionCodes: readonly string[]
}

type TopicCodes = { self: QuestionCodes; roommate: QuestionCodes }

/** By FE topic id (`QUESTION_TOPICS[].id`). */
export const SURVEY_CODES: Readonly<Record<string, TopicCodes>> = {
  'sleep-habit': {
    self: {
      questionCode: 'SLEEP_HABITS_H',
      optionCodes: ['FREQUENT', 'OCCASIONAL', 'RARE', 'NONE', 'UNKNOWN'],
    },
    roommate: {
      questionCode: 'SLEEP_HABITS_T',
      optionCodes: ['FREQUENT_OK', 'OCCASIONAL_OK', 'RARE_OK', 'NONE_ONLY'],
    },
  },
  bedtime: {
    // The five Figma options (team decision). The live server sends these five codes with the
    // same labels (checked 2026-11-14); a server still on the seven-option spec has no
    // FROM_22_TO_24 or FROM_00_TO_02, so the save stays blocked there.
    self: {
      questionCode: 'BEDTIME_H',
      optionCodes: [
        'BEFORE_22',
        'FROM_22_TO_24',
        'FROM_00_TO_02',
        'AFTER_02',
        'IRREGULAR',
      ],
    },
    roommate: {
      questionCode: 'BEDTIME_T',
      optionCodes: ['BY_23', 'BY_24', 'BY_01', 'BY_02', 'QUIET_ANY'],
    },
  },
  'morning-alarm': {
    self: {
      questionCode: 'ALARM_H',
      optionCodes: [
        'ONCE',
        'AT_MOST_2',
        'THREE_TO_FOUR',
        'FIVE_OR_MORE',
        'NO_ALARM',
      ],
    },
    roommate: {
      questionCode: 'ALARM_T',
      optionCodes: ['MANY_OK', 'UP_TO_4', 'UP_TO_2', 'ONCE_ONLY'],
    },
  },
  'floor-cleaning': {
    self: {
      questionCode: 'FLOOR_CLEAN_H',
      optionCodes: [
        'DAILY',
        'TWO_THREE_WEEKLY',
        'WEEKLY',
        'BIWEEKLY',
        'RARELY',
      ],
    },
    roommate: {
      questionCode: 'FLOOR_CLEAN_T',
      optionCodes: [
        'DAILY_MIN',
        'TWO_THREE_WEEKLY_MIN',
        'WEEKLY_MIN',
        'BIWEEKLY_MIN',
        'WHEN_NEEDED',
      ],
    },
  },
  'food-waste': {
    self: {
      questionCode: 'FOOD_WASTE_H',
      optionCodes: [
        'IMMEDIATELY',
        'SAME_DAY',
        'NEXT_DAY',
        'TWO_DAYS_PLUS',
        'NOT_IN_ROOM',
      ],
    },
    roommate: {
      questionCode: 'FOOD_WASTE_T',
      optionCodes: [
        'IMMEDIATELY_ONLY',
        'SAME_DAY_OK',
        'NEXT_DAY_OK',
        'NO_ISSUE_OK',
      ],
    },
  },
  belongings: {
    self: {
      questionCode: 'BELONGINGS_H',
      optionCodes: ['IMMEDIATELY', 'SAME_DAY', 'FEW_DAYS', 'WHEN_NEEDED'],
    },
    roommate: {
      questionCode: 'BELONGINGS_T',
      optionCodes: [
        'IMMEDIATELY_ONLY',
        'SAME_DAY_OK',
        'FEW_DAYS_OK',
        'NO_SPACE_INVASION',
      ],
    },
  },
  dishes: {
    self: {
      questionCode: 'DISHES_H',
      optionCodes: [
        'IMMEDIATELY',
        'SAME_DAY',
        'NEXT_DAY',
        'TWO_DAYS_PLUS',
        'NOT_IN_ROOM',
      ],
    },
    roommate: {
      questionCode: 'DISHES_T',
      optionCodes: [
        'IMMEDIATELY_ONLY',
        'SAME_DAY_OK',
        'NEXT_DAY_OK',
        'NO_ISSUE_OK',
      ],
    },
  },
  smoking: {
    self: {
      questionCode: 'SMOKING_H',
      optionCodes: ['NON_SMOKER', 'QUIT_IN_DORM', 'OUTDOOR_SMOKER'],
    },
    roommate: {
      questionCode: 'SMOKING_T',
      optionCodes: [
        'ANY_OK',
        'OUTSIDE_LOW_ODOR',
        'PREFER_NON_SMOKER',
        'NON_SMOKER_ONLY',
      ],
    },
  },
}

/**
 * Options whose Figma label (shown) differs from the live server label (2026-11-14). Both are the
 * roommate's minimum for floor cleaning: the server adds `해야`, the meaning is the same, and each
 * is tied to the code at the same place. BEDTIME_T `QUIET_ANY` and SMOKING_H `QUIT_IN_DORM`
 * differed in the Notion spec but now carry the Figma labels on the server.
 */
export const LABEL_DIFFERENCES: readonly {
  optionCode: string
  questionCode: string
  figma: string
  server: string
}[] = [
  {
    questionCode: 'FLOOR_CLEAN_T',
    optionCode: 'DAILY_MIN',
    figma: '거의 매일 한다',
    server: '거의 매일 해야 한다',
  },
  {
    questionCode: 'FLOOR_CLEAN_T',
    optionCode: 'TWO_THREE_WEEKLY_MIN',
    figma: '주 2~3회 한다',
    server: '주 2~3회는 해야 한다',
  },
]
