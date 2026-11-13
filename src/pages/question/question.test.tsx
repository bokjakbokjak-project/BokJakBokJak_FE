import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import {
  endFade,
  finishSituation,
  questionLayer,
  stepScreen,
} from '../../test/questionFade'
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

const expectShown = (element: HTMLElement) =>
  expect(element).toHaveClass('visible', 'opacity-100')
const expectHidden = (element: HTMLElement) =>
  expect(element).toHaveClass('invisible', 'opacity-0')

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
    expectHidden(questionLayer())

    // The STEP screen fades out first. The question stays hidden until that ends.
    advance(1)
    expectHidden(step)
    expectHidden(questionLayer())
    expect(questionLayer()).toHaveAttribute('inert')

    endFade(step)
    expectShown(questionLayer())
    expect(questionLayer()).not.toHaveAttribute('inert')
    expect(screen.getByText('Q1-1')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /어느 정도 있는 편인가요/ }),
    ).toBeInTheDocument()
  })

  it('shows the situation again from the question and returns with 질문 다시보기', () => {
    renderAt('/question')
    finishSituation()
    const step = screen.getByLabelText('STEP 1 상황')

    // The question fades out completely before the STEP screen fades in.
    fireEvent.click(screen.getByRole('button', { name: '상황 보기' }))
    expectHidden(questionLayer())
    expectHidden(step)

    endFade(questionLayer())
    expectShown(step)
    const showQuestion = within(step).getByRole('button', {
      name: '질문 다시보기',
    })
    expect(showQuestion).toHaveFocus()

    // It stays until the button is used, unlike the first visit.
    advance(5000)
    expectShown(step)

    // And the other way: the STEP screen leaves completely, then the question comes back.
    fireEvent.click(showQuestion)
    expectHidden(step)
    expectHidden(questionLayer())

    endFade(step)
    expectShown(questionLayer())
    expect(screen.getByRole('button', { name: '상황 보기' })).toHaveFocus()
  })

  it('ignores repeated presses while a change is under way', () => {
    renderAt('/question')
    finishSituation()
    const situationButton = screen.getByRole('button', { name: '상황 보기' })

    fireEvent.click(situationButton)
    fireEvent.click(situationButton)
    fireEvent.click(situationButton)
    endFade(questionLayer())
    expectShown(stepScreen())

    // A second fade end (or one from a stray press) does not flip the screens again.
    endFade(questionLayer())
    expectShown(stepScreen())
    expectHidden(questionLayer())

    const showQuestion = within(stepScreen()).getByRole('button', {
      name: '질문 다시보기',
    })
    fireEvent.click(showQuestion)
    fireEvent.click(showQuestion)
    endFade(stepScreen())
    endFade(stepScreen())
    expectShown(questionLayer())
    expectHidden(stepScreen())
    expect(screen.getByText('Q1-1')).toBeInTheDocument()
  })

  it('goes back when a press reverses a layer that is still fading in', () => {
    renderAt('/question')
    finishSituation()

    fireEvent.click(screen.getByRole('button', { name: '상황 보기' }))
    endFade(questionLayer())
    // The STEP screen is fading in; 질문 다시보기 turns it around before it finishes.
    fireEvent.click(
      within(stepScreen()).getByRole('button', { name: '질문 다시보기' }),
    )
    expectHidden(stepScreen())
    expectHidden(questionLayer())

    endFade(stepScreen())
    expectShown(questionLayer())
  })

  it('waits only for the layer’s own opacity fade', () => {
    renderAt('/question')
    advance(2000)

    // Fades of its children, and the visibility part of the dissolve, do not count.
    fireEvent.transitionEnd(
      within(stepScreen()).getByRole('heading', { hidden: true }),
      { propertyName: 'opacity' },
    )
    fireEvent.transitionEnd(stepScreen(), { propertyName: 'visibility' })
    expectHidden(questionLayer())

    endFade(stepScreen())
    expectShown(questionLayer())
  })

  it('switches at once with reduced motion, where there is no fade to wait for', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    try {
      renderAt('/question')
      advance(2000)
      expectHidden(stepScreen())
      expectShown(questionLayer())

      fireEvent.click(screen.getByRole('button', { name: '상황 보기' }))
      expectShown(stepScreen())
      expectHidden(questionLayer())
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('moves between questions at once, as before', () => {
    renderAt('/question')
    finishSituation()
    pick(0)
    next()

    expect(screen.getByText('Q1-2')).toBeInTheDocument()
    expectShown(questionLayer())
    expectHidden(stepScreen())

    fireEvent.click(screen.getByRole('button', { name: '이전으로' }))
    expect(screen.getByText('Q1-1')).toBeInTheDocument()
    expectShown(questionLayer())
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
  it('copies the link and offers 카카오톡 보내기 when the key is set', async () => {
    vi.stubEnv('VITE_KAKAO_JS_KEY', 'test-key')
    const sendDefault = vi.fn()
    const init = vi.fn()
    window.Kakao = {
      init,
      isInitialized: () => init.mock.calls.length > 0,
      Share: { sendDefault },
    }
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
    expect(writeText).toHaveBeenCalledTimes(1)
    const dialog = screen.getByRole('dialog', { name: '링크 복사 완료!' })
    expect(within(dialog).getByRole('button', { name: '확인' })).toBeVisible()

    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole('button', { name: '카카오톡 보내기' }),
      )
    })
    expect(sendDefault).toHaveBeenCalledTimes(1)
    const [card] = sendDefault.mock.calls[0]
    expect(card.content.title).toBe('사용자님의 룸메이트 프로필')
    expect(card.buttons[0].title).toBe('프로필 보기')
    expect(card.buttons[0].link.webUrl).toBe(writeText.mock.calls[0][0])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    vi.unstubAllEnvs()
    delete window.Kakao
  })

  it('keeps the link copied when KakaoTalk cannot open', async () => {
    vi.stubEnv('VITE_KAKAO_JS_KEY', 'test-key')
    window.Kakao = {
      init: vi.fn(),
      isInitialized: () => true,
      Share: {
        sendDefault: () => {
          throw new Error('blocked')
        },
      },
    }
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
    renderAt('/question')
    answerAll()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '공유하기' }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '카카오톡 보내기' }))
    })

    expect(
      screen.getByRole('dialog', { name: '카카오톡을 열지 못했어요' }),
    ).toHaveAccessibleDescription(/링크는 복사되어 있어요/)

    vi.unstubAllEnvs()
    delete window.Kakao
  })

  it('shows only 확인 without the Kakao key', async () => {
    vi.stubEnv('VITE_KAKAO_JS_KEY', '')
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
    renderAt('/question')
    answerAll()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '공유하기' }))
    })

    const dialog = screen.getByRole('dialog', { name: '링크 복사 완료!' })
    expect(within(dialog).getAllByRole('button')).toHaveLength(1)
    vi.unstubAllEnvs()
  })
})
