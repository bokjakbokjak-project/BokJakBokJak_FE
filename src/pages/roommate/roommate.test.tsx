import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { fromChatState } from '../../lib/chat/routes'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { resetMockChatRooms } from '../../lib/chat/chatApi.mock'
import {
  getCandidate,
  getCandidateAnswers,
  getCandidates,
} from '../../lib/roommate/roommateData'
import { QUESTION_TOPICS } from '../question/questionData'

function renderAt(path: string, state?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
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

    fireEvent.click(screen.getByRole('button', { name: '리스트 더보기' }))
    expect(cards()).toHaveLength(10)
    expect(cards()[5]).toHaveTextContent('남윤경')

    fireEvent.click(screen.getByRole('button', { name: '리스트 더보기' }))
    expect(cards()).toHaveLength(15)
    expect(cards()[14]).toHaveTextContent('송가은')
    expect(
      screen.queryByRole('button', { name: '리스트 더보기' }),
    ).not.toBeInTheDocument()
  })

  it('returns to the first state from the refresh button', () => {
    renderAt('/roommate')
    fireEvent.click(screen.getByRole('button', { name: '리스트 더보기' }))

    fireEvent.click(screen.getByRole('button', { name: /새로고침/ }))

    expect(cards()).toHaveLength(5)
  })

  it('keeps the expanded list after returning from a candidate', () => {
    renderAt('/roommate')
    fireEvent.click(screen.getByRole('button', { name: '리스트 더보기' }))

    openCard('남윤경')
    fireEvent.click(screen.getByRole('link', { name: '이전' }))

    expect(cards()).toHaveLength(10)
  })

  it('marks the roommate item as current in the navigation', () => {
    renderAt('/roommate')
    const nav = screen.getByRole('navigation', { name: '하단 메뉴' })

    expect(within(nav).getByRole('link', { name: '룸메이트' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: '홈' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('keeps the expanded list after visiting the chat tab', async () => {
    renderAt('/roommate')
    fireEvent.click(screen.getByRole('button', { name: '리스트 더보기' }))

    fireEvent.click(screen.getByRole('link', { name: '채팅' }))
    expect(
      await screen.findByRole('heading', { name: '채팅' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: '룸메이트' }))

    expect(cards()).toHaveLength(10)
  })

  it('keeps the expanded list after visiting the home', () => {
    renderAt('/roommate')
    fireEvent.click(screen.getByRole('button', { name: '리스트 더보기' }))

    fireEvent.click(screen.getByRole('link', { name: '홈' }))
    fireEvent.click(screen.getByRole('link', { name: '룸메이트' }))

    expect(cards()).toHaveLength(10)
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
    expect(
      screen.getByRole('heading', { name: '상세 프로필' }),
    ).toBeInTheDocument()

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
  const card = (title: string) => screen.getByRole('region', { name: title })

  it('shows the five summary cards with the candidate answers', () => {
    renderAt('/roommate/sujeong/profile')

    for (const title of [
      '잠버릇',
      '기상알람',
      '청소 청결',
      '개인 청결',
      '흡연유무',
    ]) {
      expect(card(title)).toBeInTheDocument()
    }
    const sleep = card('잠버릇')
    expect(sleep).toHaveTextContent(QUESTION_TOPICS[0].self.text.split('\n')[0])
    expect(sleep).toHaveTextContent('자주 있다는 말을 들었다')
    expect(sleep).toHaveTextContent('가끔 있는 정도는 괜찮다')
  })

  it('pages each card on its own, with both answers following the question', () => {
    renderAt('/roommate/seoyun/profile')
    const seoyun = getCandidate('seoyun')!
    const alarm = card('기상알람')
    const cleaning = card('청소 청결')
    const next = within(alarm).getByRole('button', { name: /다음 질문/ })

    expect(alarm).toHaveTextContent('1/2')
    expect(alarm).toHaveTextContent(seoyun.answers[1].selfAnswer)
    fireEvent.click(next)
    expect(alarm).toHaveTextContent('2/2')
    expect(alarm).toHaveTextContent(QUESTION_TOPICS[2].self.text.split('\n')[0])
    expect(alarm).toHaveTextContent(seoyun.answers[2].selfAnswer)
    expect(alarm).toHaveTextContent(seoyun.answers[2].partnerAnswer)
    expect(next).toBeDisabled()
    expect(cleaning).toHaveTextContent('1/2')
    expect(
      within(card('흡연유무')).queryByRole('button', { name: /질문/ }),
    ).not.toBeInTheDocument()
  })

  it('shows the candidate answers, not the user survey answers', () => {
    renderAt('/roommate/seoyun/profile')

    const answers = getCandidateAnswers(getCandidate('seoyun')!)
    expect(card('흡연유무')).toHaveTextContent(answers[14])
    expect(card('흡연유무')).toHaveTextContent(answers[15])
    expect(screen.queryByText('아직 답하지 않았어요')).not.toBeInTheDocument()
  })

  it('keeps one row per survey topic for every candidate', () => {
    for (const candidate of getCandidates()) {
      expect(candidate.answers.map((row) => row.topicId)).toEqual(
        QUESTION_TOPICS.map((topic) => topic.id),
      )
    }
  })

  it('builds the other candidates from the real survey options', () => {
    for (const candidate of getCandidates().slice(1)) {
      candidate.answers.forEach((row, index) => {
        const topic = QUESTION_TOPICS[index]
        expect(topic.self.options).toContain(row.selfAnswer)
        expect(topic.roommate.options).toContain(row.partnerAnswer)
      })
    }
  })
})

describe('chat request', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    resetMockChatRooms()
  })

  const dialog = () =>
    screen.queryByRole('dialog', { name: '대화 요청을 보냈어요!' })
  const request = async () => {
    await act(async () => {
      fireEvent.click(chatButton())
    })
    return screen.getByRole('dialog', { name: '대화 요청을 보냈어요!' })
  }

  it.each(['/roommate/sujeong', '/roommate/sujeong/profile'])(
    'shows the sent dialog in development on %s',
    async (path) => {
      renderAt(path)

      expect(chatButton()).toBeEnabled()
      const sent = await request()

      expect(sent).toHaveAccessibleDescription(
        /^성공적으로 대화 요청을 보냈어요!\s*룸메이트에게 답장이 올 때까지 기다려봐요$/,
      )
      expect(
        within(sent).getByRole('button', { name: '계속 둘러보기' }),
      ).toBeInTheDocument()
      expect(
        within(sent).getByRole('button', { name: '대화창 이동' }),
      ).toBeInTheDocument()
      expect(localStorage).toHaveLength(0)
    },
  )

  it('keeps browsing on the same screen', async () => {
    renderAt('/roommate/sujeong')
    const sent = await request()

    fireEvent.click(within(sent).getByRole('button', { name: '계속 둘러보기' }))

    expect(dialog()).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '수정님과의 나의 매칭결과' }),
    ).toBeInTheDocument()
    expect(chatButton()).toHaveFocus()
    expect(chatButton()).toBeEnabled()
  })

  it('closes with Escape like 계속 둘러보기', async () => {
    renderAt('/roommate/sujeong/profile')
    const sent = await request()

    fireEvent.keyDown(sent, { key: 'Escape' })

    expect(dialog()).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '상세 프로필' }),
    ).toBeInTheDocument()
  })

  it('opens the chat room with the candidate', async () => {
    renderAt('/roommate/sujeong/profile')
    const sent = await request()

    fireEvent.click(within(sent).getByRole('button', { name: '대화창 이동' }))

    expect(
      await screen.findByRole('heading', { name: '민수정님' }),
    ).toBeInTheDocument()
    expect(dialog()).not.toBeInTheDocument()
  })

  it('opens the chat list when the candidate has no room yet', async () => {
    renderAt('/roommate/daeun')
    const sent = await request()

    fireEvent.click(within(sent).getByRole('button', { name: '대화창 이동' }))

    expect(
      await screen.findByRole('heading', { name: '채팅' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '채팅', current: 'page' }),
    ).toBeInTheDocument()
  })

  it.each(['/roommate/sujeong', '/roommate/sujeong/profile'])(
    'is disabled and does nothing in production on %s',
    (path) => {
      vi.stubEnv('DEV', false)
      renderAt(path)
      const before = document.body.textContent

      expect(chatButton()).toBeDisabled()
      fireEvent.click(chatButton())

      expect(document.body.textContent).toBe(before)
      expect(dialog()).not.toBeInTheDocument()
      expect(localStorage).toHaveLength(0)
    },
  )

  it.each(['/roommate/sujeong', '/roommate/sujeong/profile'])(
    'stays outside the scroll area on %s',
    (path) => {
      renderAt(path)

      const bar = screen.getByTestId('chat-request-bar')
      expect(screen.getByTestId('roommate-scroll')).not.toContainElement(bar)
      expect(
        screen.getAllByRole('button', { name: '대화 요청하기' }),
      ).toHaveLength(1)
    },
  )
})

describe('roommate screens opened from a chat room', () => {
  const chatState = fromChatState('jeonhyeyun')

  it('use the same design and the same chat request', async () => {
    renderAt('/roommate/hyeyun/profile', chatState)

    expect(
      screen.getByRole('heading', { name: '상세 프로필' }),
    ).toBeInTheDocument()
    for (const title of [
      '잠버릇',
      '기상알람',
      '청소 청결',
      '개인 청결',
      '흡연유무',
    ]) {
      expect(screen.getByRole('region', { name: title })).toBeInTheDocument()
    }
    const bar = screen.getByTestId('chat-request-bar')
    expect(screen.getByTestId('roommate-scroll')).not.toContainElement(bar)
    expect(chatButton()).toBeEnabled()
    await act(async () => {
      fireEvent.click(chatButton())
    })
    expect(
      screen.getByRole('dialog', { name: '대화 요청을 보냈어요!' }),
    ).toBeInTheDocument()
  })

  it('return to the chat room through the analysis', async () => {
    renderAt('/roommate/hyeyun/profile', chatState)

    fireEvent.click(screen.getByRole('link', { name: '이전' }))
    expect(
      screen.getByRole('heading', { name: '혜윤님과의 나의 매칭결과' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: '이전' }))
    expect(
      await screen.findByRole('heading', { name: '전혜윤님' }),
    ).toBeInTheDocument()
  })

  it.each([
    ['no state', undefined],
    ['a chat state without a room', { from: 'chat' }],
    ['another kind of state', { from: 'home' }],
    ['a room id with a path', { from: 'chat', roomId: 'minsujeong/menu' }],
    ['an empty room id', { from: 'chat', roomId: '' }],
  ])('fall back to the list with %s', (_, state) => {
    renderAt('/roommate/hyeyun/profile', state)

    fireEvent.click(screen.getByRole('link', { name: '이전' }))
    fireEvent.click(screen.getByRole('link', { name: '이전' }))

    expect(screen.getByTestId('roommate-list')).toBeInTheDocument()
  })
})
