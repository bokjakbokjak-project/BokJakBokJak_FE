import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { getCandidates } from '../../lib/roommate/roommateData'
import { QUESTION_TOPICS } from '../question/questionData'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

const openCard = (name: string) =>
  fireEvent.click(screen.getByRole('link', { name: new RegExp(name) }))
const cards = () =>
  within(screen.getByTestId('roommate-list')).getAllByRole('link')
const chatButton = () => screen.getByRole('button', { name: '대화 요청하기' })

describe('roommate list', () => {
  it('shows the five Figma candidates in order', () => {
    renderAt('/roommate')

    const text = cards().map((card) => card.textContent)
    expect(text).toHaveLength(5)
    expect(text[0]).toContain('민수정')
    expect(text[0]).toContain('21세')
    expect(text[0]).toContain('소프트웨어학과')
    expect(text[0]).toContain('87%')
    expect(text[4]).toContain('전혜윤')
    expect(text[4]).toContain('71%')
  })

  it('adds five candidates per click, then hides the more button', () => {
    renderAt('/roommate')

    fireEvent.click(screen.getByRole('button', { name: '+더보기' }))
    expect(cards()).toHaveLength(10)
    expect(cards()[5]).toHaveTextContent('남윤경')

    fireEvent.click(screen.getByRole('button', { name: '+더보기' }))
    expect(cards()).toHaveLength(15)
    expect(cards()[14]).toHaveTextContent('송가은')
    expect(
      screen.queryByRole('button', { name: '+더보기' }),
    ).not.toBeInTheDocument()
  })

  it('returns to the first state from the refresh button', () => {
    renderAt('/roommate')
    fireEvent.click(screen.getByRole('button', { name: '+더보기' }))

    fireEvent.click(screen.getByRole('button', { name: /새로고침/ }))

    expect(cards()).toHaveLength(5)
  })

  it('keeps the expanded list after returning from a candidate', () => {
    renderAt('/roommate')
    fireEvent.click(screen.getByRole('button', { name: '+더보기' }))

    openCard('남윤경')
    fireEvent.click(screen.getByRole('link', { name: '이전' }))

    expect(cards()).toHaveLength(10)
  })

  it('enables only the roommate item in the navigation', () => {
    renderAt('/roommate')
    const nav = screen.getByRole('navigation', { name: '하단 메뉴' })

    expect(within(nav).getByRole('link', { name: '룸메이트' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    for (const name of ['홈', '채팅', '마이']) {
      expect(within(nav).getByRole('button', { name })).toBeDisabled()
    }
  })
})

describe('sample candidates', () => {
  it('have unique ids and are ordered by match rate', () => {
    const candidates = getCandidates()

    expect(new Set(candidates.map(({ id }) => id)).size).toBe(candidates.length)
    const rates = candidates.map(({ matchRate }) => matchRate)
    expect(rates).toEqual([...rates].sort((a, b) => b - a))
  })
})

describe('candidate screens', () => {
  it('opens the analysis of the chosen candidate', () => {
    renderAt('/roommate')

    openCard('이서윤')

    expect(screen.getByRole('heading', { name: /이서윤/ })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '서윤님과의 나의 매칭결과' }),
    ).toBeInTheDocument()
    expect(screen.getByText('86')).toBeInTheDocument()
  })

  it('shows the three Figma categories and copy for the sample candidate', () => {
    renderAt('/roommate/sujeong')

    for (const title of [
      '이런 점이 잘 맞아요',
      '이런 점은 조율해봐요',
      '아직 확인이 필요해요',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
    expect(
      screen.getByText('방 안 통화는 밖에서 하길 원해요.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '수정님과의 나의 매칭결과' }),
    ).toBeInTheDocument()
  })

  it('changes the analysis with the candidate', () => {
    renderAt('/roommate/hyena')

    expect(
      screen.getByRole('heading', { name: '혜나님과의 나의 매칭결과' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('방 안 통화는 밖에서 하길 원해요.'),
    ).not.toBeInTheDocument()
  })

  it('moves to the detail profile and back to the same candidate', () => {
    renderAt('/roommate/yujeong')

    fireEvent.click(screen.getByRole('link', { name: /상세프로필 보기/ }))
    expect(screen.getByRole('heading', { name: /서유정/ })).toBeInTheDocument()
    expect(screen.getByText('83')).toBeInTheDocument()
    expect(screen.getByText('본인')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: '이전' }))
    expect(
      screen.getByRole('heading', { name: '유정님과의 나의 매칭결과' }),
    ).toBeInTheDocument()
  })

  it('returns from the analysis to the list', () => {
    renderAt('/roommate/sujeong')

    fireEvent.click(screen.getByRole('link', { name: '이전' }))

    expect(screen.getByTestId('roommate-list')).toBeInTheDocument()
  })

  it.each(['/roommate/nobody', '/roommate/nobody/profile'])(
    'sends the unknown address %s to the list',
    (path) => {
      renderAt(path)

      expect(screen.getByTestId('roommate-list')).toBeInTheDocument()
    },
  )
})

describe('detail profile data', () => {
  it('shows the Figma sample as drawn, including its repeated question', () => {
    renderAt('/roommate/sujeong/profile')

    const items = screen
      .getAllByRole('listitem')
      .filter((item) => item.hasAttribute('data-tone'))
    expect(items).toHaveLength(8)
    expect(screen.getAllByText(/^Q2\. 평일에/)).toHaveLength(2)
    expect(items[0]).toHaveAttribute('data-tone', 'rank1')
    expect(items[4]).toHaveAttribute('data-tone', 'rank3')
    expect(items[7]).toHaveAttribute('data-tone', 'rest')
  })

  it('builds the other candidates from the real survey questions and options', () => {
    for (const candidate of getCandidates().slice(1)) {
      expect(candidate.answers).toHaveLength(QUESTION_TOPICS.length)
      candidate.answers.forEach((row, index) => {
        const topic = QUESTION_TOPICS[index]
        expect(row.question).toContain(topic.self.text.replace('\n', ' '))
        expect(topic.self.options).toContain(row.selfAnswer)
        expect(topic.roommate.options).toContain(row.partnerAnswer)
      })
    }
  })
})

describe('chat request', () => {
  it.each(['/roommate/sujeong', '/roommate/sujeong/profile'])(
    'is disabled and does nothing on %s',
    (path) => {
      renderAt(path)
      const before = document.body.textContent

      expect(chatButton()).toBeDisabled()
      fireEvent.click(chatButton())

      expect(document.body.textContent).toBe(before)
      expect(localStorage).toHaveLength(0)
    },
  )
})
