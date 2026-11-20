import { describe, expect, it } from 'vitest'
import { CATEGORY_SERVER_CODES } from '../../lib/onboarding/categories'
import { SURVEY_CODES } from '../../lib/survey/surveyCodes'
import { schemaData } from '../../test/surveyFixture'
import {
  QUESTION_COUNT,
  QUESTION_TOPICS,
  getQuestionIndex,
  getTopicOrder,
} from './questionData'

const topicIds = (order: readonly number[]) =>
  order.map((index) => QUESTION_TOPICS[index].id)

describe('survey order by priority', () => {
  it('keeps the usual order without priorities', () => {
    expect(topicIds(getTopicOrder([]))).toEqual(
      QUESTION_TOPICS.map(({ id }) => id),
    )
  })

  it('asks the chosen cards first, in rank order, then the others in the usual order', () => {
    expect(
      topicIds(getTopicOrder(['temperature', 'smoking', 'cleaning'])),
    ).toEqual([
      'temperature',
      'smoking',
      'floor-cleaning',
      'food-waste',
      'sleep-habit',
      'bedtime',
      'morning-alarm',
      'belongings',
    ])
  })

  it('keeps the topics of one card together, in their usual order', () => {
    expect(
      topicIds(
        getTopicOrder([
          'personal-hygiene',
          'wake-alarm',
          'temperature',
          'sleep-habit',
          'cleaning',
          'smoking',
        ]),
      ),
    ).toEqual([
      'belongings',
      'bedtime',
      'morning-alarm',
      'temperature',
      'sleep-habit',
      'floor-cleaning',
      'food-waste',
      'smoking',
    ])
  })

  it('maps every step to a different question, self before roommate', () => {
    const order = getTopicOrder(['smoking', 'cleaning', 'sleep-habit'])
    const indexes = Array.from({ length: QUESTION_COUNT }, (_, step) =>
      getQuestionIndex(order, step),
    )
    expect(new Set(indexes).size).toBe(QUESTION_COUNT)
    // 흡연 (topic 6) first: its self question (12), then its roommate question (13).
    expect(indexes.slice(0, 4)).toEqual([12, 13, 6, 7])
  })

  it('puts each topic under the card the server files it under', () => {
    const serverCategory = new Map(
      schemaData().topics.map((topic) => [
        topic.topic_code,
        topic.category_code,
      ]),
    )
    for (const topic of QUESTION_TOPICS) {
      const topicCode = SURVEY_CODES[topic.id].self.questionCode.replace(
        /_H$/,
        '',
      )
      expect([topic.id, serverCategory.get(topicCode)]).toEqual([
        topic.id,
        CATEGORY_SERVER_CODES[topic.category],
      ])
    }
  })
})
