import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import {
  createShareUrl,
  readSharedProfile,
  type SharedProfile,
} from '../../lib/share/profileShare'
import {
  ANSWER_ROW_LABELS,
  answerRow,
  answerRowLabels,
  mineSection,
  wantedSection,
} from '../../test/answerSections'
import { QUESTION_COUNT, getQuestionStep } from '../question/questionData'

const answers = Object.fromEntries(
  Array.from({ length: QUESTION_COUNT }, (_, index) => [
    index,
    getQuestionStep(index).question.options[0],
  ]),
)

const PROFILE: SharedProfile = {
  name: '복작이',
  department: '소프트웨어학부',
  priorities: ['sleep-habit', 'cleaning', 'smoking', 'wake-alarm'],
  answers,
}

function hashOf(profile: SharedProfile) {
  return new URL(createShareUrl(profile, 'https://example.com')).hash
}

function renderShared(hash: string) {
  render(
    <MemoryRouter initialEntries={[`/share${hash}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('share link', () => {
  it('carries the profile and the answers in the hash and reads them back', () => {
    const url = createShareUrl(PROFILE, 'https://example.com')

    expect(url).toMatch(/^https:\/\/example\.com\/share#[\w-]+$/)
    expect(readSharedProfile(new URL(url).hash)).toEqual(PROFILE)
  })

  it('leaves out the dishes answers of a link made before 온도 replaced them', () => {
    // A version 1 link, made when questions 13 and 14 (indexes 12 and 13) were about dishes.
    const v1 = {
      v: 1,
      n: '복작이',
      d: '소프트웨어학부',
      p: ['sleep-habit', 'cleaning', 'smoking'],
      a: Array.from({ length: 16 }, () => 0),
    }
    const bytes = new TextEncoder().encode(JSON.stringify(v1))
    const hash = `#${btoa(String.fromCharCode(...bytes)).replace(/=+$/, '')}`
    const shared = readSharedProfile(hash)!

    expect(shared.answers[11]).toBe(getQuestionStep(11).question.options[0])
    // Its smoking answers (then 15·16) are now questions 13·14; 온도 (now 15·16) has none.
    expect(getQuestionStep(12).topic.id).toBe('smoking')
    expect(shared.answers[12]).toBe(getQuestionStep(12).question.options[0])
    expect(shared.answers[13]).toBe(getQuestionStep(13).question.options[0])
    expect(shared.answers[14]).toBeUndefined()
    expect(shared.answers[15]).toBeUndefined()
  })

  it('moves the answers of a version 2 link, made when 온도 came before smoking', () => {
    // Version 2 (2026-11-19 to 11-20): indexes 12·13 were 온도 and 14·15 smoking.
    const a = Array.from({ length: 16 }, () => 0)
    a[12] = 3 // 온도: 거의 사용하지 않는다
    a[13] = 3 // 온도: 거의 사용하지 않았으면 좋겠다
    a[14] = 2 // 흡연: 흡연하며 지정된 실외 장소를 이용할 예정이다
    a[15] = 3 // 흡연: 흡연자와는 같은 방이 어렵다
    const v2 = { v: 2, n: '복작이', d: '소프트웨어학부', p: ['smoking'], a }
    const bytes = new TextEncoder().encode(JSON.stringify(v2))
    const hash = `#${btoa(String.fromCharCode(...bytes)).replace(/=+$/, '')}`
    const shared = readSharedProfile(hash)!

    expect(shared.answers[12]).toBe(
      '흡연하며 지정된 실외 장소를 이용할 예정이다',
    )
    expect(shared.answers[13]).toBe('흡연자와는 같은 방이 어렵다')
    expect(shared.answers[14]).toBe('거의 사용하지 않는다')
    expect(shared.answers[15]).toBe('거의 사용하지 않았으면 좋겠다')
  })

  it('rejects a broken or foreign hash', () => {
    expect(readSharedProfile('#not-base64!')).toBeNull()
    expect(readSharedProfile(`#${btoa('{"v":2}')}`)).toBeNull()
  })
})

describe('shared profile page (QA 15, Figma 1952:39744)', () => {
  it('shows the card without age or match rate, and points to 복작복작', () => {
    renderShared(hashOf(PROFILE))

    const prompt = screen.getByRole('dialog', {
      name: /복작복작에서 설문조사하고\s*복작이님과의 매칭률을 확인해요!/,
    })
    fireEvent.click(within(prompt).getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(
      screen.getByRole('heading', { name: '복작이님' }),
    ).toBeInTheDocument()
    expect(screen.getByText('소프트웨어학부')).toBeInTheDocument()
    expect(screen.queryByText(/\d+세/)).not.toBeInTheDocument()
    expect(screen.getByText('??')).toBeInTheDocument()
  })

  it('shows every own answer, and blurs the wanted rows after the first (Figma 2339:26489)', () => {
    renderShared(hashOf(PROFILE))
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))

    const mine = mineSection()
    expect(answerRowLabels(mine)).toEqual(ANSWER_ROW_LABELS)
    expect(within(mine).queryByTestId('shared-blurred')).toBeNull()

    const wanted = wantedSection()
    const blurred = screen.getByTestId('shared-blurred')
    expect(wanted).toContainElement(blurred)
    expect(blurred).toHaveAttribute('inert')
    expect(blurred).not.toContainElement(answerRow(wanted, '잠버릇'))
    expect(answerRowLabels(blurred)).toEqual(ANSWER_ROW_LABELS.slice(1))
    expect(
      within(wanted).getByText(/복작복작에서\s*설문조사하고 이어보기/),
    ).toBeInTheDocument()

    fireEvent.click(
      within(wanted).getByRole('button', { name: '복작복작으로 이동' }),
    )
    expect(
      screen.getByRole('button', { name: 'Sign up with Google' }),
    ).toBeInTheDocument()
  })

  it('explains a link that cannot be read', () => {
    renderShared('#broken')

    expect(screen.getByText(/공유된 프로필을 열 수 없어요/)).toBeInTheDocument()
  })
})
