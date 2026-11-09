import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { getMatchStatus } from '../../lib/home/matchStatus'
import { isFromHome } from '../../lib/home/routes'
import { QUESTION_COUNT, getQuestionStep } from '../question/questionData'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

const nav = () => screen.getByRole('navigation', { name: '하단 메뉴' })
const clickLink = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('link', { name }))
const NOTICE = '아직 준비 중입니다.'

/** Opens the home with the preview's sample name and character. */
function openSeededHome() {
  renderAt('/dev/onboarding')
  fireEvent.click(screen.getByRole('button', { name: '/home' }))
}

describe('home', () => {
  it('starts before a match, with the name and the character from onboarding', () => {
    openSeededHome()

    expect(
      screen.getByRole('heading', {
        name: /안녕하세요 미리보기님.*어떤 룸메이트가 찾아올까요\?/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('같이 살게 될까?')).toBeInTheDocument()

    const character = screen.getByRole('img', { name: /캐릭터/ })
    const layer = (name: string) =>
      character.querySelector(`[data-layer="${name}"]`)
    expect(layer('head')).toHaveAttribute('data-variant', 'sleep-habit')
    expect(layer('hand')).toHaveAttribute('data-variant', 'wake-alarm')
    expect(layer('body')).toHaveAttribute('data-variant', 'cleaning')
    expect(layer('rug')).not.toBeInTheDocument()
  })

  it('does not become matched by viewing a candidate', () => {
    openSeededHome()

    clickLink('룸메이트')
    clickLink(/민수정/)
    clickLink(/상세프로필 보기/)
    renderAtHomeFromProfile()

    expect(getMatchStatus()).toBe('before')
    expect(screen.getByText('같이 살게 될까?')).toBeInTheDocument()
  })

  it('shows the matched copy only on the preview route', () => {
    renderAt('/dev/home/matched')

    expect(
      screen.getByRole('heading', {
        name: /룸메이트와.*즐거운 기숙사 생활이 되길 바라요!/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('만나게 되어 기뻐!')).toBeInTheDocument()
  })

  it('falls back to a generic name without onboarding data', () => {
    renderAt('/home')

    expect(
      screen.getByRole('heading', { name: /안녕하세요 사용자님/ }),
    ).toBeInTheDocument()
  })
})

function renderAtHomeFromProfile() {
  fireEvent.click(screen.getByRole('link', { name: '이전' }))
  fireEvent.click(screen.getByRole('link', { name: '이전' }))
  clickLink('홈')
}

describe('bottom navigation', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('moves between home and roommate and marks the current item', () => {
    renderAt('/home')
    const current = (name: string) =>
      within(nav()).getByRole('link', { name }).getAttribute('aria-current')

    expect(current('홈')).toBe('page')
    expect(current('룸메이트')).toBeNull()

    clickLink('룸메이트')
    expect(screen.getByTestId('roommate-list')).toBeInTheDocument()
    expect(current('룸메이트')).toBe('page')
    expect(current('홈')).toBeNull()

    clickLink('홈')
    expect(screen.getByTestId('home-scroll')).toBeInTheDocument()
    expect(current('홈')).toBe('page')
  })

  it.each(['채팅'])('shows the notice for %s and stays on the page', (name) => {
    vi.useFakeTimers()
    renderAt('/home')
    const status = within(nav()).getByRole('status')
    expect(status).toBeEmptyDOMElement()

    fireEvent.click(screen.getByRole('button', { name }))

    expect(status).toHaveTextContent(NOTICE)
    expect(screen.getByTestId('home-scroll')).toBeInTheDocument()
    expect(within(nav()).getByRole('link', { name: '홈' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name })).not.toHaveAttribute(
      'aria-current',
    )

    act(() => vi.advanceTimersByTime(2999))
    expect(status).toHaveTextContent(NOTICE)
    act(() => vi.advanceTimersByTime(1))
    expect(status).toBeEmptyDOMElement()
  })

  it('restarts the notice time on another click', () => {
    vi.useFakeTimers()
    renderAt('/roommate')
    const status = within(nav()).getByRole('status')

    fireEvent.click(screen.getByRole('button', { name: '채팅' }))
    act(() => vi.advanceTimersByTime(2000))
    fireEvent.click(screen.getByRole('button', { name: '채팅' }))
    act(() => vi.advanceTimersByTime(2999))

    expect(status).toHaveTextContent(NOTICE)
    act(() => vi.advanceTimersByTime(1))
    expect(status).toBeEmptyDOMElement()
  })
})

describe('notifications', () => {
  it('opens from the bell and returns to the home', () => {
    renderAt('/home')

    clickLink(/^알림/)
    expect(screen.getByRole('heading', { name: '알림' })).toBeInTheDocument()

    clickLink('뒤로')
    expect(screen.getByTestId('home-scroll')).toBeInTheDocument()
  })

  it('shows the state without notifications today', () => {
    renderAt('/notifications')

    expect(screen.getByText('오늘 받은 알림이 없어요.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(7)
    expect(screen.getAllByText('새 알림')).toHaveLength(1)
    expect(
      screen.getByText('받은 알림은 30일동안 보관됩니다.'),
    ).toBeInTheDocument()
  })

  it('shows the state with a notification today on the preview route', () => {
    renderAt('/dev/notifications/today')

    expect(
      screen.queryByText('오늘 받은 알림이 없어요.'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('룸메이트님')).toBeInTheDocument()
    expect(screen.getByText('오후2:23')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getAllByText('새 알림')).toHaveLength(1)
  })
})

describe('state across screens', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const answerAll = () => {
    for (let index = 0; index < QUESTION_COUNT; index += 1) {
      if (index % 2 === 0) {
        act(() => vi.advanceTimersByTime(2000))
        act(() => vi.advanceTimersByTime(500))
      }
      fireEvent.click(
        screen.getByRole('radio', {
          name: getQuestionStep(index).question.options[0],
        }),
      )
      fireEvent.click(screen.getByRole('button', { name: '다음으로' }))
    }
  }

  it('keeps the name, the character, and the answers through home and roommate', () => {
    vi.useFakeTimers()
    openSeededHome()
    clickLink('내 설문 다시보기 →')
    answerAll()

    const firstAnswer = getQuestionStep(0).question.options[0]
    expect(
      screen.getByRole('heading', { name: '미리보기님의 정보' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '홈화면으로 가기' }))
    expect(
      screen.getByRole('heading', { name: /안녕하세요 미리보기님/ }),
    ).toBeInTheDocument()

    clickLink('룸메이트')
    clickLink('홈')
    expect(
      screen
        .getByRole('img', { name: /캐릭터/ })
        .querySelector('[data-layer="head"]'),
    ).toHaveAttribute('data-variant', 'sleep-habit')

    clickLink('내 설문 다시보기 →')
    expect(
      screen.getByRole('heading', { name: '미리보기님의 정보' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(firstAnswer).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: '홈화면으로 가기' }))
    expect(screen.getByTestId('home-scroll')).toBeInTheDocument()
  })

  it('returns to the home from a review opened on the home, keeping everything', () => {
    vi.useFakeTimers()
    openSeededHome()
    clickLink('내 설문 다시보기 →')
    answerAll()
    fireEvent.click(screen.getByRole('button', { name: '홈화면으로 가기' }))
    clickLink('룸메이트')
    fireEvent.click(screen.getByRole('button', { name: '+더보기' }))
    clickLink('홈')

    clickLink('내 설문 다시보기 →')
    fireEvent.click(screen.getByRole('button', { name: '뒤로' }))

    expect(
      screen.getByRole('heading', { name: /안녕하세요 미리보기님/ }),
    ).toBeInTheDocument()
    expect(
      screen
        .getByRole('img', { name: /캐릭터/ })
        .querySelector('[data-layer="head"]'),
    ).toHaveAttribute('data-variant', 'sleep-habit')

    clickLink('내 설문 다시보기 →')
    expect(
      screen.getByRole('heading', { name: '미리보기님의 정보' }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(getQuestionStep(0).question.options[0]).length,
    ).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: '뒤로' }))
    clickLink('룸메이트')
    expect(
      within(screen.getByTestId('roommate-list')).getAllByRole('link'),
    ).toHaveLength(10)
  })

  it('keeps the survey as the back target right after finishing the survey', () => {
    vi.useFakeTimers()
    renderAt('/question')
    answerAll()

    fireEvent.click(screen.getByRole('button', { name: '뒤로' }))

    expect(screen.getByRole('button', { name: '다음으로' })).toBeEnabled()
    expect(
      screen.getByRole('radio', {
        name: getQuestionStep(QUESTION_COUNT - 1).question.options[0],
      }),
    ).toBeChecked()
  })

  it('keeps the survey as the back target when the home sent an unfinished user to the survey', () => {
    vi.useFakeTimers()
    openSeededHome()
    clickLink('내 설문 다시보기 →')
    answerAll()

    fireEvent.click(screen.getByRole('button', { name: '뒤로' }))

    expect(screen.getByRole('button', { name: '다음으로' })).toBeEnabled()
  })

  it.each([
    [null, false],
    [undefined, false],
    ['home', false],
    [{}, false],
    [{ from: 'roommate' }, false],
    [{ from: 'home' }, true],
  ])('reads the entry state %j as from home: %s', (state, expected) => {
    expect(isFromHome(state)).toBe(expected)
  })

  it('still sends the survey review back to the survey without answers', () => {
    renderAt('/home')

    clickLink('내 설문 다시보기 →')

    expect(
      screen.getByRole('heading', { name: /밤에 함께 자고 있는데/ }),
    ).toBeInTheDocument()
  })
})
