import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { QUESTION_COUNT, getQuestionStep } from './questionData'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

const pick = (index: number) =>
  fireEvent.click(
    screen.getByRole('radio', {
      name: getQuestionStep(index).question.options[0],
    }),
  )

const next = () =>
  fireEvent.click(screen.getByRole('button', { name: '다음으로' }))

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))

// The STEP screen leaves after 2 seconds. The dissolve after it is CSS only.
const finishSituation = () => advance(2000)

function answerQuestions() {
  for (let index = 0; index < QUESTION_COUNT; index += 1) {
    if (index % 2 === 0) finishSituation()
    pick(index)
    next()
  }
}

/** Answers everything and waits out the loading screen. */
function answerAll() {
  answerQuestions()
  advance(2000)
}

describe('situational survey', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens each topic on its STEP screen, then shows the question after 2 seconds', () => {
    renderAt('/question')
    const step = screen.getByLabelText('STEP 1 상황')

    expect(step).toHaveClass('visible')
    expect(
      within(step).getByRole('heading', { name: /밤에 함께 자고 있는데/ }),
    ).toBeInTheDocument()
    expect(
      within(step).queryByRole('button', { name: '질문 다시보기' }),
    ).not.toBeInTheDocument()

    advance(1999)
    expect(step).toHaveClass('visible')

    advance(1)
    expect(step).toHaveClass('invisible', 'opacity-0')
    expect(screen.getByText('Q1-1')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /어느 정도 있는 편인가요/ }),
    ).toBeInTheDocument()
  })

  it('shows the situation again from the question and returns with 질문 다시보기', () => {
    renderAt('/question')
    finishSituation()
    const step = screen.getByLabelText('STEP 1 상황')

    fireEvent.click(screen.getByRole('button', { name: '상황 보기' }))
    expect(step).toHaveClass('visible')
    const showQuestion = within(step).getByRole('button', {
      name: '질문 다시보기',
    })
    expect(showQuestion).toHaveFocus()

    // It stays until the button is used, unlike the first visit.
    advance(5000)
    expect(step).toHaveClass('visible')

    fireEvent.click(showQuestion)
    expect(step).toHaveClass('invisible')
    expect(screen.getByRole('button', { name: '상황 보기' })).toHaveFocus()
  })

  it('numbers the roommate question of a topic as its second question', () => {
    renderAt('/question')
    finishSituation()
    pick(0)
    next()

    expect(screen.getByText('Q1-2')).toBeInTheDocument()
    expect(screen.getByLabelText('STEP 1 상황')).toHaveClass('invisible')
  })

  it('uses the light STEP screen for the next topic', () => {
    renderAt('/question')
    finishSituation()
    pick(0)
    next()
    pick(1)
    next()

    const step = screen.getByRole('region', { name: 'STEP 2 상황' })
    expect(step).toHaveClass('visible')
    expect(within(step).getByRole('heading')).toHaveClass('text-brand-brown1')
  })

  it('needs an answer after the situation ends', () => {
    renderAt('/question')

    finishSituation()
    expect(screen.getByRole('button', { name: '다음으로' })).toBeDisabled()
  })

  it('goes back to a previous question with its answer kept', () => {
    renderAt('/question')
    finishSituation()
    pick(0)
    next()

    expect(screen.getByText('Q1-2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음으로' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '이전으로' }))

    expect(screen.getByText('Q1-1')).toBeInTheDocument()
    expect(
      screen.getByRole('radio', {
        name: getQuestionStep(0).question.options[0],
      }),
    ).toBeChecked()
  })

  it('fills one progress segment per topic', () => {
    renderAt('/question')
    const progress = () => screen.getByRole('progressbar')

    expect(progress()).toHaveAttribute('aria-valuenow', '1')
    finishSituation()
    pick(0)
    next()
    pick(1)
    next()
    expect(progress()).toHaveAttribute('aria-valuenow', '2')
  })

  it('shows both answers of every topic on the profile', () => {
    renderAt('/question')
    answerAll()

    expect(
      screen.getByRole('heading', { name: '사용자님' }),
    ).toBeInTheDocument()
    expect(screen.getByText('자주 있어도 괜찮다')).toBeInTheDocument()
    expect(screen.getByText('흡연 여부는 상관없다')).toBeInTheDocument()
  })

  it('shows the loading screen for 2 seconds before the result', () => {
    renderAt('/question')
    answerQuestions()

    expect(
      screen.getByRole('heading', { name: '잠시만 기다려 주세요,' }),
    ).toBeInTheDocument()
    expect(screen.getByText('프로필을 만들고 있어요')).toBeInTheDocument()

    advance(1999)
    expect(
      screen.queryByRole('heading', { name: '사용자님' }),
    ).not.toBeInTheDocument()

    advance(1)
    expect(
      screen.getByRole('heading', { name: '사용자님' }),
    ).toBeInTheDocument()
  })

  it('sends a loading visit without answers back to the survey', () => {
    renderAt('/question/loading')

    expect(
      screen.getByRole('heading', { name: /밤에 함께 자고 있는데/ }),
    ).toBeInTheDocument()
  })

  it('sends a profile visit without answers back to the survey', () => {
    renderAt('/question/profile')

    expect(
      screen.getByRole('heading', { name: /밤에 함께 자고 있는데/ }),
    ).toBeInTheDocument()
  })

  it('scrolls the card and the answers between the fixed header and home button', () => {
    renderAt('/question')
    answerAll()

    const scroll = screen.getByTestId('result-scroll')
    expect(scroll).toHaveClass('overflow-y-auto')
    expect(scroll).toContainElement(
      screen.getByRole('heading', { name: '사용자님' }),
    )
    expect(scroll).toContainElement(
      screen.getByRole('heading', { name: '상세 답변 요약' }),
    )
    expect(scroll).not.toContainElement(
      screen.getByRole('heading', { name: '상세 프로필' }),
    )
    expect(scroll).not.toContainElement(
      screen.getByRole('button', { name: '홈화면으로 가기' }),
    )
    expect(screen.queryByTestId('roommate-scroll')).not.toBeInTheDocument()
  })

  it('copies the share link and confirms it (QA 11)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    renderAt('/question')
    answerAll()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '공유하기' }))
    })

    expect(writeText).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/localhost(:\d+)?\/share#.+/),
    )
    const dialog = screen.getByRole('dialog', { name: '링크 복사 완료!' })
    expect(dialog).toHaveAccessibleDescription(
      /^링크를 공유하고 다른 룸메이트들과\s*설문 결과를 비교해보세요$/,
    )
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
