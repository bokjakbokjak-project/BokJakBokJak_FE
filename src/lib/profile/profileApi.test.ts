import { describe, expect, it } from 'vitest'
import { FIRST_OPTION_ANSWERS, profileData } from '../../test/surveyFixture'
import { ApiError } from '../api/apiError'
import {
  NICKNAME_MAX_LENGTH,
  checkNickname,
  parseMyProfile,
  parseProfileCards,
} from './profileApi'

const withAnswer = (questionCode: string, optionCode: string) =>
  FIRST_OPTION_ANSWERS.map((answer) =>
    answer.question_code === questionCode
      ? { ...answer, option_code: optionCode }
      : answer,
  )

describe('my profile response', () => {
  it('reads the snake_case profile with the top three categories', () => {
    const profile = parseMyProfile(profileData())

    expect(profile).toMatchObject({
      userId: 42,
      nickname: '서버닉네임',
      age: 21,
      department: '서버학과',
      surveyRevision: 1,
      topCategories: ['smoking', 'cleaning', 'sleep-habit'],
    })
  })

  it('refuses the camelCase shape that Swagger shows', () => {
    expect(() =>
      parseMyProfile({
        userId: 42,
        nickname: '서버닉네임',
        age: 21,
        department: '서버학과',
        topCategories: [],
        surveyRevision: 1,
        categories: [],
      }),
    ).toThrow(ApiError)
  })

  it('builds five cards and eight topics from the owner’s habit and tolerance answers', () => {
    const cards = parseMyProfile(profileData()).cards!

    expect(cards.map((card) => card.category)).toEqual([
      'sleep-habit',
      'wake-alarm',
      'cleaning',
      'personal-hygiene',
      'smoking',
    ])
    expect(cards.flatMap((card) => card.items)).toHaveLength(8)
    // 나의 성향 is the habit answer, 원하는 성향 the tolerance answer.
    expect(cards[0].items[0]).toMatchObject({
      topicId: 'sleep-habit',
      mine: '자주 있다는 말을 들었다',
      wanted: '자주 있어도 괜찮다',
    })
    // Two topics in one category are the card's 1/2 pages.
    expect(cards[1].items.map((item) => item.topicId)).toEqual([
      'bedtime',
      'morning-alarm',
    ])
  })

  it('keeps the Figma titles, questions and the Figma wording of an answer', () => {
    const cards = parseMyProfile(
      profileData({
        answers: withAnswer('FLOOR_CLEAN_T', 'TWO_THREE_WEEKLY_MIN'),
      }),
    ).cards!
    const cleaning = cards.find((card) => card.category === 'cleaning')!

    expect(cleaning.title).toBe('청소 청결')
    expect(cleaning.items[0].question).toBe(
      '나는 방 바닥을 보통 얼마나\n자주 청소하나요?',
    )
    // The server says `주 2~3회는 해야 한다`; the screens keep the Figma `주 2~3회 한다`.
    expect(cleaning.items[0].wanted).toBe('주 2~3회 한다')
  })

  it('leaves the cards out, not the profile, when the answers are not in the agreed shape', () => {
    // The Swagger schema shows survey questions and options without the chosen answers.
    const swaggerShaped = [
      {
        category_code: 'SLEEP_HABITS',
        name: '잠버릇',
        topics: [{ topic_code: 'SLEEP_HABITS', questions: [] }],
      },
    ]
    expect(parseProfileCards(swaggerShaped)).toBeNull()
    expect(
      parseMyProfile({ ...profileData(), categories: swaggerShaped }),
    ).toMatchObject({ nickname: '서버닉네임', cards: null })
  })

  it('keeps an empty rank for an unknown top category code', () => {
    const profile = parseMyProfile(
      profileData({ topCategories: ['SMOKING', 'NEW_CODE', 'CLEANING'] }),
    )
    expect(profile.topCategories).toEqual(['smoking', undefined, 'cleaning'])
  })
})

describe('nickname rule', () => {
  it('trims and accepts 1 to 20 characters', () => {
    expect(checkNickname('  복작이  ')).toEqual({
      ok: true,
      nickname: '복작이',
    })
    expect(checkNickname('가'.repeat(NICKNAME_MAX_LENGTH))).toMatchObject({
      ok: true,
    })
  })

  it('refuses a blank or a longer nickname', () => {
    expect(checkNickname('   ')).toMatchObject({ ok: false })
    expect(checkNickname('가'.repeat(NICKNAME_MAX_LENGTH + 1))).toEqual({
      ok: false,
      message: '닉네임은 1~20자로 입력해주세요.',
    })
  })
})
