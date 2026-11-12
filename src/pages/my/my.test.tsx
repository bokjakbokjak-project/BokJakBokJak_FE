import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { ANSWER_GROUPS, getAnswerSummary } from '../../lib/answerSummary'
import { CATEGORY_IDS } from '../../lib/onboarding/categories'
import { QUESTION_COUNT, QUESTION_TOPICS } from '../question/questionData'

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
/** The answer summary starts folded; opens it once when a test reads a card. */
function openSummary() {
  const toggle = screen.queryByRole('button', {
    name: '상세 프로필 보기',
    expanded: false,
  })
  if (toggle) fireEvent.click(toggle)
}
const card = (title: string) => {
  openSummary()
  return screen.getByRole('region', { name: title })
}
const layer = (part: string) =>
  screen
    .getByRole('img', { name: /캐릭터/ })
    .querySelector(`[data-layer="${part}"]`)
    ?.getAttribute('data-variant')

/** Opens the my page with the preview's sample profile and sample survey answers. */
function openSeededMyPage() {
  renderAt('/dev/onboarding')
  fireEvent.click(button('/my (샘플 설문 답변)'))
}

const selfOption = (topic: number, option: number) =>
  QUESTION_TOPICS[topic].self.options[option]
const roommateOption = (topic: number, option: number) =>
  QUESTION_TOPICS[topic].roommate.options[option]

describe('answer summary data', () => {
  it('groups all eight survey topics into the five categories, in survey order', () => {
    const topicIds = ANSWER_GROUPS.flatMap((group) => group.topicIds)

    expect(ANSWER_GROUPS.map((group) => group.category)).toEqual([
      ...CATEGORY_IDS,
    ])
    expect(topicIds).toEqual(QUESTION_TOPICS.map((topic) => topic.id))
    expect(ANSWER_GROUPS.map((group) => group.topicIds.length)).toEqual([
      1, 2, 2, 2, 1,
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
    items.forEach((item, topic) => {
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

  it('folds the answer summary behind the last menu row', () => {
    openSeededMyPage()
    const toggle = button('상세 프로필 보기')
    const summaryId = toggle.getAttribute('aria-controls') as string
    const summary = document.getElementById(summaryId) as HTMLElement

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(summary).not.toBeVisible()
    expect(screen.queryByRole('region', { name: '잠버릇' })).toBeNull()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(summary).toBeVisible()
    expect(
      within(summary).getByRole('heading', { name: '상세 답변 요약' }),
    ).toBeInTheDocument()
    for (const title of [
      '잠버릇',
      '기상알람',
      '청소 청결',
      '개인 청결',
      '흡연유무',
    ]) {
      expect(
        within(summary).getByRole('region', { name: title }),
      ).toBeInTheDocument()
    }
    expect(screen.getAllByText(selfOption(0, 0)).length).toBeGreaterThan(0)

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(summary).not.toBeVisible()
  })

  it('keeps the menu order and the other rows working while the summary is open', () => {
    vi.useFakeTimers()
    openSeededMyPage()
    const rows = within(
      button('상세 프로필 보기').parentElement as HTMLElement,
    ).getAllByRole('button')

    expect(rows.map((row) => row.textContent)).toEqual([
      '로그아웃 하기',
      '설문조사 다시 하기',
      '상세 프로필 보기',
    ])

    fireEvent.click(button('상세 프로필 보기'))
    fireEvent.click(button('로그아웃 하기'))
    expect(within(nav()).getByRole('status')).toHaveTextContent(
      '아직 준비 중입니다.',
    )

    fireEvent.click(button('설문조사 다시 하기'))
    expect(
      screen.getByRole('alertdialog', { name: /처음부터 다시 설정/ }),
    ).toBeInTheDocument()
  })

  it('centers the character as in Figma Profile2, only on the my page', () => {
    openSeededMyPage()
    const stage = screen.getByTestId('profile-avatar-stage')
    const scale = 104 / 250

    expect(parseFloat(stage.style.left)).toBeCloseTo(-2 - 20 * scale, 3)
    expect(parseFloat(stage.style.width)).toBeCloseTo(302 * scale, 3)

    fireEvent.click(link('닉네임 수정'))
    const editStage = screen.getByTestId('profile-avatar-stage')
    expect(parseFloat(editStage.style.left)).toBeCloseTo(
      -5.21 - (20 * 104.951) / 250,
      3,
    )
  })

  it('shows the nickname, the character, and the real answers', () => {
    openSeededMyPage()

    expect(
      screen.getByRole('heading', { name: '미리보기' }),
    ).toBeInTheDocument()
    expect(layer('head')).toBe('sleep-habit')
    expect(layer('hand')).toBe('wake-alarm')
    expect(layer('body')).toBe('cleaning')

    const titles = ['잠버릇', '기상알람', '청소 청결', '개인 청결', '흡연유무']
    titles.forEach((title) => expect(card(title)).toBeInTheDocument())

    const sleep = card('잠버릇')
    expect(sleep).toHaveTextContent(selfOption(0, 0))
    expect(sleep).toHaveTextContent(roommateOption(0, 1))
    expect(
      within(sleep).queryByRole('button', { name: /다음 질문/ }),
    ).not.toBeInTheDocument()
  })

  it('pages through the questions of one card without moving the others', () => {
    openSeededMyPage()
    const alarm = card('기상알람')
    const cleaning = card('청소 청결')
    const previous = within(alarm).getByRole('button', { name: /이전 질문/ })
    const next = within(alarm).getByRole('button', { name: /다음 질문/ })

    expect(alarm).toHaveTextContent('1/2')
    expect(alarm).toHaveTextContent(QUESTION_TOPICS[1].self.options[0])
    expect(previous).toBeDisabled()

    fireEvent.click(next)
    expect(alarm).toHaveTextContent('2/2')
    expect(alarm).toHaveTextContent(QUESTION_TOPICS[2].self.text.split('\n')[0])
    expect(alarm).toHaveTextContent(selfOption(2, 0))
    expect(alarm).toHaveTextContent(roommateOption(2, 1))
    expect(next).toBeDisabled()
    expect(cleaning).toHaveTextContent('1/2')

    fireEvent.click(previous)
    expect(alarm).toHaveTextContent('1/2')
    expect(alarm).toHaveTextContent(selfOption(1, 0))
  })

  it('shows a safe empty state without survey answers', () => {
    renderAt('/my')

    expect(screen.getByRole('heading', { name: '사용자' })).toBeInTheDocument()
    expect(card('잠버릇')).toHaveTextContent('아직 답하지 않았어요')
    expect(card('잠버릇')).not.toHaveTextContent(selfOption(0, 0))
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
    expect(card('잠버릇')).toHaveTextContent(selfOption(0, 0))
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
    expect(card('흡연유무')).toHaveTextContent(selfOption(7, 0))
    expect(layer('head')).toBe('sleep-habit')
  })

  it('keeps everything when moving to the roommate list and back', () => {
    openSeededMyPage()

    fireEvent.click(link('룸메이트'))
    fireEvent.click(link('마이'))

    expect(
      screen.getByRole('heading', { name: '미리보기' }),
    ).toBeInTheDocument()
    expect(card('흡연유무')).toHaveTextContent(selfOption(7, 0))
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
    expect(card('잠버릇')).toHaveTextContent(selfOption(0, 0))
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

  const answerAll = () => {
    for (let index = 0; index < QUESTION_COUNT; index += 1) {
      if (index % 2 === 0) {
        act(() => vi.advanceTimersByTime(2000))
        act(() => vi.advanceTimersByTime(500))
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
    expect(dialog).toHaveTextContent('처음부터 다시 설정하시겠어요?')

    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(card('잠버릇')).toHaveTextContent(selfOption(0, 0))
    expect(layer('head')).toBe('sleep-habit')
  })

  it('starts again from the priority step and shows the new answers afterwards', () => {
    vi.useFakeTimers()
    openSeededMyPage()

    fireEvent.click(button('설문조사 다시 하기'))
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: '다시 하기',
      }),
    )

    // The priority step opens with no selection, and the mission notice is not forced again.
    expect(screen.queryByRole('button', { pressed: true })).toBeNull()
    const finish = button('완료하기')
    expect(finish).toBeDisabled()

    fireEvent.click(button(/흡연유무/))
    fireEvent.click(button(/개인청결/))
    expect(finish).toBeDisabled()
    fireEvent.click(button(/잠버릇/))
    expect(finish).toBeEnabled()
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

    // The survey starts again at the first question, with nothing selected.
    expect(
      screen.getByRole('heading', { name: /밤에 함께 자고 있는데/ }),
    ).toBeInTheDocument()
    answerAll()

    expect(
      screen.getByRole('heading', { name: '미리보기님' }),
    ).toBeInTheDocument()
    fireEvent.click(button('홈화면으로 가기'))
    expect(screen.getByTestId('home-scroll')).toBeInTheDocument()

    fireEvent.click(link('마이'))
    expect(
      screen.getByRole('heading', { name: '미리보기' }),
    ).toBeInTheDocument()
    expect(layer('head')).toBe('smoking')
    const lastSelf = QUESTION_TOPICS[0].self.options.at(-1) as string
    expect(card('잠버릇')).toHaveTextContent(lastSelf)
    expect(card('잠버릇')).not.toHaveTextContent(selfOption(0, 0))
  })
})
