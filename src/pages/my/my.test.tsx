import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { ANSWER_GROUPS, getAnswerSummary } from '../../lib/answerSummary'
import {
  ANSWER_ROW_LABELS,
  answerRow,
  answerRowLabels,
  mineSection,
  wantedSection,
} from '../../test/answerSections'
import { finishSituation } from '../../test/questionFade'
import { QUESTION_COUNT, QUESTION_TOPICS } from '../question/questionData'
import { friendlyAnswer } from '../../lib/friendlyAnswers'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

const nav = () => screen.getByRole('navigation', { name: '하단 메뉴' })
const button = (name: string | RegExp) => screen.getByRole('button', { name })
const link = (name: string | RegExp) => screen.getByRole('link', { name })
/** The answers are on the detail profile behind the last row; opens it when a test reads a card. */
function openSummary() {
  const row = screen.queryByRole('link', { name: '상세 프로필 보기' })
  if (row) fireEvent.click(row)
}
const mineRow = (label: string) => {
  openSummary()
  return answerRow(mineSection(), label)
}
const wantedRow = (label: string) => {
  openSummary()
  return answerRow(wantedSection(), label)
}
const layer = (part: string) =>
  screen
    .getByRole('img', { name: /캐릭터/ })
    .querySelector(`[data-layer="${part}"]`)
    ?.getAttribute('data-variant')

/** Opens the my page with the preview's sample profile and sample survey answers. */
const SMOKING_TOPIC = QUESTION_TOPICS.findIndex(({ id }) => id === 'smoking')

function openSeededMyPage() {
  renderAt('/dev/onboarding')
  fireEvent.click(button('/my (샘플 설문 답변)'))
}

const selfOption = (topic: number, option: number) =>
  QUESTION_TOPICS[topic].self.options[option]
const roommateOption = (topic: number, option: number) =>
  QUESTION_TOPICS[topic].roommate.options[option]
/** How the detail profile says an answer (friendly wording). */
const selfShown = (topic: number, option: number) =>
  friendlyAnswer(QUESTION_TOPICS[topic].id, 'self', selfOption(topic, option))
const roommateShown = (topic: number, option: number) =>
  friendlyAnswer(
    QUESTION_TOPICS[topic].id,
    'roommate',
    roommateOption(topic, option),
  )

describe('answer summary data', () => {
  it('groups all eight survey topics into six rows, in survey order', () => {
    const topicIds = ANSWER_GROUPS.flatMap((group) => group.topicIds)

    // Figma 2339:27404: 온도 before 흡연 on the profile, even though the survey asks 흡연 first
    // (the backend's order since 2026-11-20). The rows cover every survey topic once.
    expect(ANSWER_GROUPS.map((group) => group.category)).toEqual([
      'sleep-habit',
      'wake-alarm',
      'cleaning',
      'personal-hygiene',
      'temperature',
      'smoking',
    ])
    expect(ANSWER_GROUPS.map((group) => group.label)).toEqual(ANSWER_ROW_LABELS)
    expect([...topicIds].sort()).toEqual(
      QUESTION_TOPICS.map((topic) => topic.id).sort(),
    )
    expect(topicIds).toEqual([
      'sleep-habit',
      'bedtime',
      'morning-alarm',
      'floor-cleaning',
      'food-waste',
      'belongings',
      'temperature',
      'smoking',
    ])
    expect(ANSWER_GROUPS.map((group) => group.topicIds.length)).toEqual([
      1, 2, 2, 1, 1, 1,
    ])
  })

  it('reads the self answer from 2n and the roommate answer from 2n+1', () => {
    const answers = Object.fromEntries(
      Array.from({ length: QUESTION_COUNT }, (_, index) => [
        index,
        `answer-${index}`,
      ]),
    )
    const items = getAnswerSummary(answers).flatMap((group) => group.items)

    expect(items).toHaveLength(QUESTION_TOPICS.length)
    items.forEach((item) => {
      const topic = QUESTION_TOPICS.findIndex(({ id }) => id === item.topicId)
      expect(item.question).toBe(QUESTION_TOPICS[topic].self.text)
      expect(item.mine).toBe(`answer-${topic * 2}`)
      expect(item.wanted).toBe(`answer-${topic * 2 + 1}`)
    })
  })

  it('marks missing answers instead of filling them in', () => {
    const items = getAnswerSummary({}).flatMap((group) => group.items)

    expect(
      items.every((item) => item.mine === null && item.wanted === null),
    ).toBe(true)
  })
})

describe('my page', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens from the bottom bar and marks the my item as current', () => {
    renderAt('/home')

    fireEvent.click(within(nav()).getByRole('link', { name: '마이' }))

    expect(screen.getByRole('heading', { name: '프로필' })).toBeInTheDocument()
    expect(within(nav()).getByRole('link', { name: '마이' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav()).getByRole('link', { name: '홈' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('opens the detail profile from the last menu row and comes back', () => {
    openSeededMyPage()

    fireEvent.click(link('상세 프로필 보기'))
    expect(
      screen.getByRole('heading', { name: '상세 프로필' }),
    ).toBeInTheDocument()
    expect(answerRowLabels(mineSection())).toEqual(ANSWER_ROW_LABELS)
    expect(answerRowLabels(wantedSection())).toEqual(ANSWER_ROW_LABELS)
    // My own detail profile shows every row, with no blur.
    expect(screen.queryByTestId('shared-blurred')).not.toBeInTheDocument()

    fireEvent.click(link('이전'))
    expect(screen.getByRole('heading', { name: '프로필' })).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: '전 이런 사람이에요' }),
    ).toBeNull()
  })

  it('keeps the menu order and the other rows working', () => {
    vi.useFakeTimers()
    openSeededMyPage()
    const list = link('상세 프로필 보기').parentElement as HTMLElement
    const rows = [...list.querySelectorAll('a, button')]

    expect(rows.map((row) => row.textContent)).toEqual([
      '로그아웃 하기',
      '설문조사 다시 하기',
      '상세 프로필 보기',
    ])

    fireEvent.click(button('로그아웃 하기'))
    expect(within(nav()).getByRole('status')).toHaveTextContent(
      '아직 준비 중입니다.',
    )

    fireEvent.click(button('설문조사 다시 하기'))
    expect(
      screen.getByRole('alertdialog', { name: /다시 설정하시겠어요/ }),
    ).toBeInTheDocument()
  })

  it('centers the character as in Figma Profile2 on the my page and the nickname screen', () => {
    // Profile2 draws the 104px head at x=-2 of the 100px frame, with the stroke outside it.
    const centeredLeft = -2 - 20 * (104 / 250)
    const stageLeft = () =>
      parseFloat(
        (screen.getByTestId('profile-avatar').firstElementChild as HTMLElement)
          .style.left,
      )
    openSeededMyPage()
    expect(stageLeft()).toBeCloseTo(centeredLeft, 3)
    expect(screen.getByTestId('profile-avatar')).toHaveClass('size-[110.416px]')

    fireEvent.click(link('닉네임 수정'))
    expect(stageLeft()).toBeCloseTo(centeredLeft, 3)
  })

  it('shows the nickname, the character, and the real answers', () => {
    openSeededMyPage()

    expect(
      screen.getByRole('heading', { name: '미리보기' }),
    ).toBeInTheDocument()
    expect(layer('head')).toBe('sleep-habit')
    expect(layer('hand')).toBe('wake-alarm')
    expect(layer('body')).toBe('cleaning')

    expect(mineRow('잠버릇')).toHaveTextContent(selfShown(0, 0))
    expect(wantedRow('잠버릇')).toHaveTextContent(roommateShown(0, 1))
    expect(answerRowLabels(mineSection())).toEqual(ANSWER_ROW_LABELS)
  })

  it('shows both answers of a two-question group in one row', () => {
    openSeededMyPage()
    const mine = mineRow('기상알람')
    const wanted = wantedRow('기상알람')

    expect(mine).toHaveTextContent(selfShown(1, 0))
    expect(mine).toHaveTextContent(selfShown(2, 0))
    expect(wanted).toHaveTextContent(roommateShown(2, 1))
    expect(
      screen.queryByRole('button', { name: /질문/ }),
    ).not.toBeInTheDocument()
  })

  it('sends the detail profile to the survey without survey answers', () => {
    renderAt('/my')

    expect(screen.getByRole('heading', { name: '사용자' })).toBeInTheDocument()
    fireEvent.click(link('상세 프로필 보기'))
    expect(
      screen.getByRole('heading', { name: /밤에 함께 자고 있는데/ }),
    ).toBeInTheDocument()
  })

  it('shows the not-ready notice for log out without leaving or clearing anything', () => {
    vi.useFakeTimers()
    openSeededMyPage()
    const status = within(nav()).getByRole('status')

    fireEvent.click(button('로그아웃 하기'))

    expect(status).toHaveTextContent('아직 준비 중입니다.')
    expect(
      screen.getByRole('heading', { name: '미리보기' }),
    ).toBeInTheDocument()
    expect(layer('head')).toBe('sleep-habit')
    act(() => vi.advanceTimersByTime(3000))
    expect(status).toBeEmptyDOMElement()
  })

  it('goes back to the home from its back button', () => {
    openSeededMyPage()

    fireEvent.click(button('뒤로'))

    expect(screen.getByTestId('home-scroll')).toBeInTheDocument()
  })

  it('keeps everything when visiting the chat tab and back', async () => {
    openSeededMyPage()

    fireEvent.click(link('채팅'))
    expect(
      await screen.findByRole('heading', { name: '채팅' }),
    ).toBeInTheDocument()
    fireEvent.click(link('마이'))

    expect(
      screen.getByRole('heading', { name: '미리보기' }),
    ).toBeInTheDocument()
    expect(mineRow('흡연')).toHaveTextContent(selfShown(SMOKING_TOPIC, 0))
    expect(layer('head')).toBe('sleep-habit')
  })

  it('keeps everything when moving to the roommate list and back', () => {
    openSeededMyPage()

    fireEvent.click(link('룸메이트'))
    fireEvent.click(link('마이'))

    expect(
      screen.getByRole('heading', { name: '미리보기' }),
    ).toBeInTheDocument()
    expect(mineRow('흡연')).toHaveTextContent(selfShown(SMOKING_TOPIC, 0))
  })
})

describe('nickname', () => {
  it('opens from the pencil next to the name with the current nickname', () => {
    openSeededMyPage()

    fireEvent.click(link('닉네임 수정'))

    expect(screen.getByLabelText('닉네임')).toHaveValue('미리보기')
    expect(button('저장')).toBeEnabled()
    expect(
      screen.queryByRole('navigation', { name: '하단 메뉴' }),
    ).not.toBeInTheDocument()
  })

  it('cannot save a blank nickname', () => {
    openSeededMyPage()
    fireEvent.click(link('닉네임 수정'))

    fireEvent.change(screen.getByLabelText('닉네임'), {
      target: { value: '   ' },
    })

    expect(button('저장')).toBeDisabled()
  })

  it('saves to the my page and the home, and keeps the answers and character', () => {
    openSeededMyPage()
    fireEvent.click(link('닉네임 수정'))

    fireEvent.change(screen.getByLabelText('닉네임'), {
      target: { value: '  복작복작  ' },
    })
    fireEvent.click(button('저장'))

    expect(
      screen.getByRole('heading', { name: '복작복작' }),
    ).toBeInTheDocument()
    expect(layer('head')).toBe('sleep-habit')

    fireEvent.click(link('홈'))
    expect(
      screen.getByRole('heading', { name: /안녕하세요 복작복작님/ }),
    ).toBeInTheDocument()
  })

  it('discards the change when going back', () => {
    openSeededMyPage()
    fireEvent.click(link('닉네임 수정'))

    fireEvent.change(screen.getByLabelText('닉네임'), {
      target: { value: '바뀐이름' },
    })
    fireEvent.click(button('뒤로'))

    expect(
      screen.getByRole('heading', { name: '미리보기' }),
    ).toBeInTheDocument()
  })

  it('returns to the my page when opened directly', () => {
    renderAt('/my/edit-name')

    fireEvent.click(button('뒤로'))

    expect(screen.getByRole('heading', { name: '프로필' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '사용자' })).toBeInTheDocument()
  })
})

describe('retaking the survey', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const answerAll = ({ withSituations = true } = {}) => {
    for (let index = 0; index < QUESTION_COUNT; index += 1) {
      if (index % 2 === 0 && withSituations) {
        finishSituation()
      }
      const topic = QUESTION_TOPICS[Math.floor(index / 2)]
      const options =
        index % 2 === 0 ? topic.self.options : topic.roommate.options
      fireEvent.click(
        screen.getByRole('radio', { name: options[options.length - 1] }),
      )
      fireEvent.click(button('다음으로'))
    }
    // The loading screen after the last question stays for 2 seconds.
    act(() => vi.advanceTimersByTime(2000))
  }

  it('keeps everything when the confirmation is cancelled', () => {
    openSeededMyPage()

    fireEvent.click(button('설문조사 다시 하기'))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('다시 설정하시겠어요?')
    // The answers come prefilled, and a changed save restarts the agenda talks of a chat.
    expect(dialog).toHaveAccessibleDescription(/이전 답변이 미리 채워져 있어요/)
    expect(dialog).toHaveTextContent('안건 조율이 처음부터')
    expect(dialog).toHaveTextContent('대화 내용은 그대로 남아요')

    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(mineRow('잠버릇')).toHaveTextContent(selfShown(0, 0))
    expect(layer('head')).toBe('sleep-habit')
  })

  it('starts from the priority step with the saved priorities and answers, and shows the changes afterwards', async () => {
    vi.useFakeTimers()
    openSeededMyPage()

    fireEvent.click(button('설문조사 다시 하기'))
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: '다시 하기',
      }),
    )
    await act(async () => {})

    // The priority step opens with the saved priorities chosen, ready to be finished as they are.
    const prefilled = screen.getAllByRole('button', { pressed: true })
    expect(prefilled.length).toBeGreaterThanOrEqual(3)
    expect(layer('head')).toBe('sleep-habit')
    // Unchanged, it moves on to the saved answers (다음으로); changed, it reads 수정하기.
    const finish = button('다음으로')
    expect(finish).toBeEnabled()

    // Choosing again: clear them first.
    for (const card of prefilled) fireEvent.click(card)
    expect(finish).toBeDisabled()

    fireEvent.click(button(/흡연유무/))
    fireEvent.click(button(/개인청결/))
    expect(finish).toBeDisabled()
    fireEvent.click(button(/잠버릇/))
    expect(finish).toBeEnabled()
    expect(finish).toHaveTextContent('수정하기')
    const threeRanks = ['head', 'hand', 'body'].map(layer).join()
    expect(threeRanks).toBe('smoking,personal-hygiene,sleep-habit')

    fireEvent.click(button(/기상알람/))
    fireEvent.click(button(/청소,청결/))
    expect(['head', 'hand', 'body'].map(layer).join()).toBe(threeRanks)
    expect(finish).toBeEnabled()

    fireEvent.click(finish)
    expect(
      screen.getByRole('heading', { name: /등록완료!/ }),
    ).toBeInTheDocument()
    fireEvent.click(button('시작하기!'))

    // The survey starts again at the first question with the saved answer selected. An answered
    // question opens without its STEP screen, as when going back to it (상황 보기 still shows it).
    expect(screen.getByText('Q1-1')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: selfOption(0, 0) })).toBeChecked()
    answerAll({ withSituations: false })

    expect(
      screen.getByRole('heading', { name: '미리보기님' }),
    ).toBeInTheDocument()
    fireEvent.click(button('룸메이트 보러 가기'))
    expect(screen.getByTestId('roommate-list')).toBeInTheDocument()

    fireEvent.click(link('마이'))
    expect(
      screen.getByRole('heading', { name: '미리보기' }),
    ).toBeInTheDocument()
    expect(layer('head')).toBe('smoking')
    const last = QUESTION_TOPICS[0].self.options.length - 1
    expect(mineRow('잠버릇')).toHaveTextContent(selfShown(0, last))
    expect(mineRow('잠버릇')).not.toHaveTextContent(selfShown(0, 0))
  })
})
