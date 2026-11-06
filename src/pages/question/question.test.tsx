import { act, fireEvent, render, screen } from '@testing-library/react'
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

const finishSituation = () => {
  advance(2000)
  advance(500)
}

function answerAll() {
  for (let index = 0; index < QUESTION_COUNT; index += 1) {
    if (index % 2 === 0) finishSituation()
    pick(index)
    next()
  }
}

describe('situational survey', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the situation for 2 seconds, fades it out, then shows the question', () => {
    renderAt('/question')
    const situation = screen.getByRole('heading', {
      name: /밤에 함께 자고 있는데/,
    })

    expect(screen.getByRole('button', { name: '다음으로' })).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: '이전으로' }),
    ).not.toBeInTheDocument()

    advance(1999)
    expect(situation.parentElement).not.toHaveClass('opacity-0')

    advance(1)
    expect(situation.parentElement).toHaveClass('opacity-0')
    expect(screen.queryByText('Q1')).not.toBeInTheDocument()

    advance(500)
    expect(screen.getByText('Q1')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /어느 정도 있는 편인가요/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('Q1').parentElement).not.toHaveClass('opacity-0')
  })

  it('keeps the sheet lowered and empty during the situation, then raises it with the question', () => {
    renderAt('/question')
    const options = screen.getByRole('group', { hidden: true })
    const buttons = screen.getByRole('button', {
      name: '다음으로',
    }).parentElement
    const sheet = options.parentElement

    expect(sheet).toHaveClass('translate-y-[66px]')
    expect(options).toHaveClass('invisible', 'opacity-0')
    expect(buttons).toHaveClass('invisible', 'opacity-0')

    advance(2000)
    expect(sheet).toHaveClass('translate-y-[66px]')

    advance(500)
    expect(sheet).not.toHaveClass('translate-y-[66px]')
    expect(options).not.toHaveClass('invisible')
    expect(buttons).not.toHaveClass('invisible')
    expect(screen.getByText('Q1')).toBeInTheDocument()
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

    expect(screen.getByText('Q2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음으로' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '이전으로' }))

    expect(screen.getByText('Q1')).toBeInTheDocument()
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
      screen.getByRole('heading', { name: '사용자님의 정보' }),
    ).toBeInTheDocument()
    expect(screen.getByText('자주 있어도 괜찮다')).toBeInTheDocument()
    expect(screen.getByText('흡연 여부는 상관없다')).toBeInTheDocument()
  })

  it('sends a profile visit without answers back to the survey', () => {
    renderAt('/question/profile')

    expect(
      screen.getByRole('heading', { name: /밤에 함께 자고 있는데/ }),
    ).toBeInTheDocument()
  })

  it('opens the share sheet and closes it with Escape', () => {
    renderAt('/question')
    answerAll()

    fireEvent.click(screen.getByRole('button', { name: '공유하기' }))
    const sheet = screen.getByRole('dialog', { name: '공유하기' })
    expect(sheet).toHaveFocus()

    fireEvent.keyDown(sheet, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
