import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import {
  createShareUrl,
  readSharedProfile,
  type SharedProfile,
} from '../../lib/share/profileShare'
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

  it('shows two answer cards and blurs the rest behind the prompt', () => {
    renderShared(hashOf(PROFILE))
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))

    expect(screen.getByRole('region', { name: '잠버릇' })).toBeVisible()
    expect(screen.getByRole('region', { name: '기상알람' })).toBeVisible()
    const blurred = screen.getByTestId('shared-blurred')
    expect(blurred).toHaveAttribute('inert')
    expect(within(blurred).getByText('청소 청결')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '청소 청결' })).toBeNull()

    fireEvent.click(
      screen.getAllByRole('button', { name: '복작복작으로 이동하기' })[0],
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
