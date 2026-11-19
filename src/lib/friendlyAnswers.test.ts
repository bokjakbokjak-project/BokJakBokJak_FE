import { describe, expect, it } from 'vitest'
import { QUESTION_TOPICS } from '../pages/question/questionData'
import { friendlyAnswer } from './friendlyAnswers'

describe('friendly answers on the detail profile', () => {
  it('has a spoken ~요 wording for every option of every question', () => {
    for (const topic of QUESTION_TOPICS) {
      for (const side of ['self', 'roommate'] as const) {
        for (const option of topic[side].options) {
          const friendly = friendlyAnswer(topic.id, side, option)
          expect(friendly, `${topic.id} ${side} ${option}`).not.toBe(option)
          expect(friendly, `${topic.id} ${side} ${option}`).toMatch(/요$/)
        }
      }
    }
  })

  it('keeps the option, only the ending changes, where it is a sentence', () => {
    expect(
      friendlyAnswer('sleep-habit', 'self', '자주 있다는 말을 들었다'),
    ).toBe('자주 있다는 말을 들었어요')
    expect(friendlyAnswer('smoking', 'self', '비흡연자다')).toBe('비흡연자예요')
    // The same label means the roommate's minimum on the roommate side.
    expect(friendlyAnswer('floor-cleaning', 'roommate', '거의 매일 한다')).toBe(
      '거의 매일 청소했으면 좋겠어요',
    )
  })

  it('shows an answer named like an object member as it is', () => {
    for (const answer of ['__proto__', 'constructor', 'toString']) {
      expect(friendlyAnswer('sleep-habit', 'self', answer)).toBe(answer)
      expect(friendlyAnswer(answer, 'self', '비흡연자다')).toBe('비흡연자다')
    }
  })

  it('shows an unknown answer as it is', () => {
    expect(friendlyAnswer('sleep-habit', 'self', '서버에서 온 다른 문구')).toBe(
      '서버에서 온 다른 문구',
    )
  })
})
