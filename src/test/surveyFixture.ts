/**
 * `data` of GET /api/surveys/current as the live server sent it on 2026-11-14 (snake_case,
 * BEDTIME_H with the five Figma options), and helpers for the survey tests. Scenario and prompt
 * texts are shortened. The older Notion spec with seven BEDTIME_H options is kept as
 * `SPEC_BEDTIME_H_OPTIONS` for the blocked-save tests. Not user data.
 */

type Option = [code: string, label: string]
type QuestionFixture = {
  code: string
  number: number
  kind: 'HABIT' | 'TOLERANCE'
  options: Option[]
}
type TopicFixture = {
  topic: string
  category: string
  questions: [QuestionFixture, QuestionFixture]
}

const q = (
  code: string,
  number: number,
  options: Option[],
): QuestionFixture => ({
  code,
  number,
  kind: code.endsWith('_H') ? 'HABIT' : 'TOLERANCE',
  options,
})

export const SPEC_BEDTIME_H_OPTIONS: Option[] = [
  ['BEFORE_22', '밤 10시 이전'],
  ['FROM_22_TO_23', '밤 10시~11시'],
  ['FROM_23_TO_24', '밤 11시~12시'],
  ['FROM_00_TO_01', '새벽 12시~1시'],
  ['FROM_01_TO_02', '새벽 1시~2시'],
  ['AFTER_02', '새벽 2시 이후'],
  ['IRREGULAR', '일정하지 않다'],
]

/** BEDTIME_H on the live server (2026-11-14): the five Figma options. */
export const FIVE_BEDTIME_H_OPTIONS: Option[] = [
  ['BEFORE_22', '밤 10시 이전'],
  ['FROM_22_TO_24', '밤 10시~12시'],
  ['FROM_00_TO_02', '새벽 12시~2시'],
  ['AFTER_02', '새벽 2시 이후'],
  ['IRREGULAR', '일정하지 않다'],
]

function topics(bedtime: Option[]): TopicFixture[] {
  return [
    {
      topic: 'SLEEP_HABITS',
      category: 'SLEEP_HABITS',
      questions: [
        q('SLEEP_HABITS_H', 1, [
          ['FREQUENT', '자주 있다는 말을 들었다'],
          ['OCCASIONAL', '가끔 있다는 말을 들었다'],
          ['RARE', '예전에 한두 번 들은 적 있다'],
          ['NONE', '없다는 말을 들었다'],
          ['UNKNOWN', '잘 모르겠다'],
        ]),
        q('SLEEP_HABITS_T', 2, [
          ['FREQUENT_OK', '자주 있어도 괜찮다'],
          ['OCCASIONAL_OK', '가끔 있는 정도는 괜찮다'],
          ['RARE_OK', '거의 없는 편이면 괜찮다'],
          ['NONE_ONLY', '없었으면 좋겠다'],
        ]),
      ],
    },
    {
      topic: 'BEDTIME',
      category: 'SLEEP_SCHEDULE',
      questions: [
        q('BEDTIME_H', 3, bedtime),
        q('BEDTIME_T', 4, [
          ['BY_23', '밤 11시까지'],
          ['BY_24', '밤 12시까지'],
          ['BY_01', '새벽 1시까지'],
          ['BY_02', '새벽 2시까지'],
          ['QUIET_ANY', '큰 소음이 아니라면 상관없다'],
        ]),
      ],
    },
    {
      topic: 'ALARM',
      category: 'SLEEP_SCHEDULE',
      questions: [
        q('ALARM_H', 5, [
          ['ONCE', '첫 알람에 바로 일어난다'],
          ['AT_MOST_2', '2번 이내로 끄고 일어난다'],
          ['THREE_TO_FOUR', '3~4번 정도 반복한다'],
          ['FIVE_OR_MORE', '5번 이상 반복하는 편이다'],
          ['NO_ALARM', '알람을 거의 사용하지 않는다'],
        ]),
        q('ALARM_T', 6, [
          ['MANY_OK', '여러 번 울려도 괜찮다'],
          ['UP_TO_4', '3~4번까지는 괜찮다'],
          ['UP_TO_2', '2번 정도까지만 괜찮다'],
          ['ONCE_ONLY', '한 번만 울렸으면 좋겠다'],
        ]),
      ],
    },
    {
      topic: 'FLOOR_CLEAN',
      category: 'CLEANING',
      questions: [
        q('FLOOR_CLEAN_H', 7, [
          ['DAILY', '거의 매일 한다'],
          ['TWO_THREE_WEEKLY', '주 2~3회 한다'],
          ['WEEKLY', '주 1회 한다'],
          ['BIWEEKLY', '2주에 1회 정도 한다'],
          ['RARELY', '더 드물게 한다'],
        ]),
        q('FLOOR_CLEAN_T', 8, [
          ['DAILY_MIN', '거의 매일 해야 한다'],
          ['TWO_THREE_WEEKLY_MIN', '주 2~3회는 해야 한다'],
          ['WEEKLY_MIN', '주 1회면 괜찮다'],
          ['BIWEEKLY_MIN', '2주 1회면 괜찮다'],
          ['WHEN_NEEDED', '필요할 때만 해도 괜찮다'],
        ]),
      ],
    },
    {
      topic: 'FOOD_WASTE',
      category: 'CLEANING',
      questions: [
        q('FOOD_WASTE_H', 9, [
          ['IMMEDIATELY', '먹은 직후 바로 치운다'],
          ['SAME_DAY', '그날 안에 치운다'],
          ['NEXT_DAY', '다음 날 치우기도 한다'],
          ['TWO_DAYS_PLUS', '이틀 이상 두는 경우도 있다'],
          ['NOT_IN_ROOM', '방에서 음식을 먹지 않는다'],
        ]),
        q('FOOD_WASTE_T', 10, [
          ['IMMEDIATELY_ONLY', '먹은 직후 바로 치워줬으면 좋겠다'],
          ['SAME_DAY_OK', '그날 안에만 치우면 괜찮다'],
          ['NEXT_DAY_OK', '다음 날까지는 괜찮다'],
          ['NO_ISSUE_OK', '냄새나 위생 문제가 없다면 더 두어도 괜찮다'],
        ]),
      ],
    },
    {
      topic: 'BELONGINGS',
      category: 'PERSONAL_HYGIENE',
      questions: [
        q('BELONGINGS_H', 11, [
          ['IMMEDIATELY', '바로 정리한다'],
          ['SAME_DAY', '그날 안에 정리한다'],
          ['FEW_DAYS', '며칠 모아두었다가 정리한다'],
          ['WHEN_NEEDED', '크게 신경 쓰지 않고 필요할 때 정리한다'],
        ]),
        q('BELONGINGS_T', 12, [
          ['IMMEDIATELY_ONLY', '바로 정리했으면 좋겠다'],
          ['SAME_DAY_OK', '그날 안에는 정리했으면 좋겠다'],
          ['FEW_DAYS_OK', '며칠 정도는 괜찮다'],
          ['NO_SPACE_INVASION', '내 공간만 침범하지 않으면 괜찮다'],
        ]),
      ],
    },
    {
      topic: 'DISHES',
      category: 'PERSONAL_HYGIENE',
      questions: [
        q('DISHES_H', 13, [
          ['IMMEDIATELY', '사용 직후 바로 정리한다'],
          ['SAME_DAY', '그날 안에 정리한다'],
          ['NEXT_DAY', '다음 날 정리하기도 한다'],
          ['TWO_DAYS_PLUS', '이틀 이상 두는 경우도 있다'],
          ['NOT_IN_ROOM', '방에서 식기를 거의 사용하지 않는다'],
        ]),
        q('DISHES_T', 14, [
          ['IMMEDIATELY_ONLY', '사용 직후 바로 정리했으면 좋겠다'],
          ['SAME_DAY_OK', '그날 안에만 정리하면 괜찮다'],
          ['NEXT_DAY_OK', '다음 날까지는 괜찮다'],
          ['NO_ISSUE_OK', '위생 문제가 없다면 더 두어도 괜찮다'],
        ]),
      ],
    },
    {
      topic: 'SMOKING',
      category: 'SMOKING',
      questions: [
        q('SMOKING_H', 15, [
          ['NON_SMOKER', '비흡연자다'],
          ['QUIT_IN_DORM', '흡연자이지만 기숙사에서는 자제할 예정이다'],
          ['OUTDOOR_SMOKER', '흡연하며 지정된 실외 장소를 이용할 예정이다'],
        ]),
        q('SMOKING_T', 16, [
          ['ANY_OK', '흡연 여부는 상관없다'],
          ['OUTSIDE_LOW_ODOR', '실외에서만 하고 냄새가 거의 없으면 괜찮다'],
          ['PREFER_NON_SMOKER', '가능한 비흡연자였으면 좋겠다'],
          ['NON_SMOKER_ONLY', '흡연자와는 같은 방이 어렵다'],
        ]),
      ],
    },
  ]
}

const CATEGORIES = [
  ['SLEEP_HABITS', '잠버릇'],
  ['SLEEP_SCHEDULE', '기상 알람'],
  ['CLEANING', '청소 청결'],
  ['PERSONAL_HYGIENE', '개인 청결'],
  ['SMOKING', '흡연 유무'],
]

/** Raw snake_case `data`, as the server sends it. */
export function schemaData({
  bedtime = FIVE_BEDTIME_H_OPTIONS,
}: { bedtime?: Option[] } = {}) {
  return {
    categories: CATEGORIES.map(([code, name], index) => ({
      category_code: code,
      name,
      display_order: index + 1,
    })),
    topics: topics(bedtime).map((topic, index) => ({
      topic_code: topic.topic,
      category_code: topic.category,
      display_order: index + 1,
      scenario_text: `${topic.topic} 상황`,
      questions: topic.questions.map((question) => ({
        question_code: question.code,
        question_number: question.number,
        kind: question.kind,
        prompt: `${question.code} 질문`,
        options: question.options.map(([code, label]) => ({
          option_code: code,
          label,
        })),
      })),
    })),
  }
}

/** The answer codes of the first FE option of each question. */
export const FIRST_OPTION_ANSWERS = [
  ['SLEEP_HABITS_H', 'FREQUENT'],
  ['SLEEP_HABITS_T', 'FREQUENT_OK'],
  ['BEDTIME_H', 'BEFORE_22'],
  ['BEDTIME_T', 'BY_23'],
  ['ALARM_H', 'ONCE'],
  ['ALARM_T', 'MANY_OK'],
  ['FLOOR_CLEAN_H', 'DAILY'],
  ['FLOOR_CLEAN_T', 'DAILY_MIN'],
  ['FOOD_WASTE_H', 'IMMEDIATELY'],
  ['FOOD_WASTE_T', 'IMMEDIATELY_ONLY'],
  ['BELONGINGS_H', 'IMMEDIATELY'],
  ['BELONGINGS_T', 'IMMEDIATELY_ONLY'],
  ['DISHES_H', 'IMMEDIATELY'],
  ['DISHES_T', 'IMMEDIATELY_ONLY'],
  ['SMOKING_H', 'NON_SMOKER'],
  ['SMOKING_T', 'ANY_OK'],
].map(([question_code, option_code]) => ({ question_code, option_code }))

/** Raw `data` of GET /api/me/survey. */
export function mySurveyData({
  revision = 0,
  completed = false,
  priorities = [] as { category_code: string; rank: number }[],
  answers = [] as { question_code: string; option_code: string }[],
} = {}) {
  return {
    revision,
    survey_completed: completed,
    submitted_at: completed ? '2026-11-14T05:00:00Z' : null,
    priorities,
    answers,
  }
}

type Answer = { question_code: string; option_code: string }

/**
 * Raw `data` of GET /api/me/profile (or, with `candidateId`, of GET /api/roommates/{id}/profile)
 * built from saved answers the way the spec describes: five categories, eight topics, each with
 * the habit question and the owner's habit and tolerance answers as option labels.
 */
export function profileData({
  answers = FIRST_OPTION_ANSWERS as Answer[],
  topCategories = ['SMOKING', 'CLEANING', 'SLEEP_HABITS'],
  nickname = '서버닉네임',
  age = 21,
  department = '서버학과',
  surveyRevision = 1,
  candidateId,
}: {
  answers?: Answer[]
  topCategories?: string[]
  nickname?: string
  age?: number | null
  department?: string
  surveyRevision?: number
  candidateId?: number
} = {}) {
  const schema = schemaData()
  const chosen = new Map(answers.map((a) => [a.question_code, a.option_code]))
  const labelOf = (questionCode: string) => {
    for (const topic of schema.topics) {
      const question = topic.questions.find(
        (q) => q.question_code === questionCode,
      )
      const option = question?.options.find(
        (o) => o.option_code === chosen.get(questionCode),
      )
      if (option) return option.label
    }
    throw new Error(`No answer for ${questionCode}`)
  }
  return {
    ...(candidateId === undefined
      ? { user_id: 42 }
      : { candidate_id: candidateId }),
    nickname,
    age,
    department,
    top_categories: topCategories,
    survey_revision: surveyRevision,
    categories: schema.categories.map((category) => ({
      category_code: category.category_code,
      name: category.name,
      topics: schema.topics
        .filter((topic) => topic.category_code === category.category_code)
        .map((topic) => ({
          topic_code: topic.topic_code,
          question: topic.questions[0].prompt,
          habit_answer: labelOf(`${topic.topic_code}_H`),
          tolerance_answer: labelOf(`${topic.topic_code}_T`),
        })),
    })),
  }
}
