import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import {
  getQuestionIndex,
  getQuestionStep,
  getTopicOrder,
} from '../../pages/question/questionData'
import { finishSituation } from '../../test/questionFade'
import { getApiMode } from '../api/config'
import { clearTokens, getRefreshToken, startSession } from '../auth/tokenStore'
import { startParticipant } from '../userTest/userTestStore'
import {
  AUTO_REPLY_MS,
  chatReducer,
  createChat,
  type ExperienceChatState,
} from './chatMachine'
import {
  chatGoesToExperience,
  dispatchExperienceChat,
  startExperienceChat,
} from './experienceChat'
import {
  getAppMode,
  isExperienceMode,
  setAppMode,
  startServiceFresh,
} from './mode'
import { scenarioForAdjust } from './scenarios'
import {
  getExperienceSession,
  pickAnotherRoommate,
  resetExperienceSessionCacheForTests,
  restartAttempt,
  startNewParticipant,
  updateExperienceSession,
} from './session'
import { getCandidate, getCandidates } from '../roommate/roommateData'

const PARTNER = {
  name: '김혜나',
  candidateId: 'hyena',
  source: 'example' as const,
}

function useExperienceBuild() {
  vi.stubEnv('VITE_EXPERIENCE', 'true')
  // The deployment talks to the server; the experience must still send nothing.
  vi.stubEnv('VITE_API_MODE', 'server')
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  resetExperienceSessionCacheForTests()
  fetchMock = vi.fn(() => Promise.reject(new Error('unexpected request')))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  clearTokens()
  localStorage.clear()
  sessionStorage.clear()
  resetExperienceSessionCacheForTests()
})

describe('mode', () => {
  it('starts the service mode at the login by dropping a kept sign-in', () => {
    startSession({ accessToken: 'a', refreshToken: 'r' })
    expect(getRefreshToken()).toBe('r')
    startServiceFresh()
    expect(getRefreshToken()).toBeNull()
  })

  it('stays on the service mode in builds without the experience', () => {
    vi.stubEnv('VITE_API_MODE', 'server')
    setAppMode('experience')
    expect(getAppMode()).toBe('service')
    expect(getApiMode()).toBe('server')
  })

  it('runs the experience on the sample flow even when the build talks to the server', () => {
    useExperienceBuild()
    expect(getApiMode()).toBe('server')
    setAppMode('experience')
    expect(isExperienceMode()).toBe(true)
    expect(getApiMode()).toBe('mock')
  })
})

describe('experience chat state', () => {
  const advance = (state: ExperienceChatState) =>
    chatReducer(state, { type: 'auto', step: state.step })

  it('goes from the agenda to both final choices, one step at a time', () => {
    let chat = createChat(PARTNER, ['cleaning'])
    expect(chat.phase).toBe('intro')

    chat = chatReducer(chat, { type: 'choose', optionId: 'weekly' })
    expect(chat.phase).toBe('partner-replying')
    // A second press while the partner answers adds nothing.
    expect(chatReducer(chat, { type: 'choose', optionId: 'weekly' })).toBe(chat)

    chat = advance(chat)
    expect(chat.phase).toBe('agree')
    expect(chat.messages.at(-1)).toMatchObject({
      from: 'partner',
      text: '좋아요. 대신 음식물 쓰레기는 그날 치우면 좋겠어요',
    })

    chat = chatReducer(chat, { type: 'agree' })
    expect(chat.messages.at(-1)).toMatchObject({
      kind: 'agreement',
      title: '1. 청소 주기',
      text: '주 1회 공동 청소, 음식물 쓰레기는 당일 처리',
    })
    // Completing the agenda is not the match.
    chat = chatReducer(chat, { type: 'complete-agenda' })
    expect(chat.phase).toBe('final')

    chat = chatReducer(chat, { type: 'confirm' })
    expect(chat.phase).toBe('partner-confirming')
    chat = advance(chat)
    expect(chat.phase).toBe('matched')
  })

  it('drops a partner move scheduled for an older state, so nothing arrives twice', () => {
    const chosen = chatReducer(createChat(PARTNER, ['cleaning']), {
      type: 'choose',
      optionId: 'weekly',
    })
    const answered = advance(chosen)
    const stale = chatReducer(answered, { type: 'auto', step: chosen.step })
    expect(stale).toBe(answered)
    expect(
      answered.messages.filter((message) => message.from === 'partner'),
    ).toHaveLength(1)
  })

  it('opens the next agenda of a two-agenda run before the final choice', () => {
    let chat = createChat(PARTNER, ['cleaning', 'bedtime'])
    chat = advance(chatReducer(chat, { type: 'choose', optionId: 'weekly' }))
    chat = chatReducer(chatReducer(chat, { type: 'agree' }), {
      type: 'complete-agenda',
    })
    expect(chat.phase).toBe('intro')
    expect(chat.agendaIndex).toBe(1)
    expect(chat.messages.at(-1)).toMatchObject({
      kind: 'agenda',
      title: '2. 잠드는 시간',
    })
  })
})

describe('예시 답변으로 건너뛰기', () => {
  it('shows from Q2-2 on, not on the first questions', () => {
    vi.useFakeTimers()
    useExperienceBuild()
    setAppMode('experience')
    startNewParticipant('booth')
    updateExperienceSession((session) => ({
      ...session,
      priorities: ['cleaning', 'smoking', 'sleep-habit'],
    }))
    render(
      <MemoryRouter initialEntries={['/question']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    const skip = () =>
      screen.queryByRole('button', { name: /예시 답변으로 건너뛰기/ })
    expect(skip()).not.toBeInTheDocument()

    // Q1-1, Q1-2 and Q2-1 answered: Q2-2 offers the skip.
    for (let index = 0; index < 3; index += 1) {
      if (index % 2 === 0) finishSituation()
      fireEvent.click(
        screen.getByRole('radio', {
          // The survey asks the topics in the priority order (getTopicOrder).
          name: getQuestionStep(
            getQuestionIndex(
              getTopicOrder(['cleaning', 'smoking', 'sleep-habit']),
              index,
            ),
          ).question.options[0],
        }),
      )
      expect(skip()).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: '다음으로' }))
    }
    expect(skip()).toBeInTheDocument()
  })
})

describe('agenda from the analysis', () => {
  it('follows the difference the analysis names', () => {
    expect(scenarioForAdjust(['혜나님은 청소를 2주에 한 번 정도 해요.'])).toBe(
      'cleaning',
    )
    expect(scenarioForAdjust(['유정님은 자정 넘어 잠드는 편이에요.'])).toBe(
      'bedtime',
    )
    expect(scenarioForAdjust(['서윤님은 알람을 두 번까지 맞춰요.'])).toBe(
      'alarm',
    )
    expect(scenarioForAdjust(['방 안 통화는 밖에서 하길 원해요.'])).toBeNull()
  })

  it('switches to the example pair instead of inventing a difference', () => {
    useExperienceBuild()
    setAppMode('experience')
    startNewParticipant('booth')
    startExperienceChat({
      name: '민수정',
      candidateId: 'sujeong',
      source: 'example',
      adjust: ['모아님은 시험기간에 늦게 공부해요.'],
    })
    const chat = getExperienceSession()!.chat!
    expect(chat.switchedToExample).toBe(true)
    expect(chat.partner.name).toBe('김혜나')
    expect(chat.agendas).toEqual(['cleaning'])
  })
})

describe('sessions', () => {
  it('starts the next participant with nothing of the previous one', () => {
    useExperienceBuild()
    setAppMode('experience')
    startNewParticipant('booth')
    const first = getExperienceSession()!.id
    startExperienceChat({ ...PARTNER, adjust: ['청소'] })
    expect(getExperienceSession()!.chat).not.toBeNull()

    startNewParticipant('booth')
    const next = getExperienceSession()!
    expect(next.id).not.toBe(first)
    expect(next.chat).toBeNull()
    expect(next.matched).toBeNull()
  })

  it('restarts the same participant as a new attempt', () => {
    useExperienceBuild()
    setAppMode('experience')
    startNewParticipant('film')
    startExperienceChat({ ...PARTNER, adjust: ['청소'] })
    restartAttempt()
    expect(getExperienceSession()).toMatchObject({
      attempt: 2,
      chat: null,
      purpose: 'film',
    })
  })

  it('gives a signed-in user test tester the experience chat, and no one else in the service', () => {
    vi.stubEnv('VITE_API_MODE', 'server')
    vi.stubEnv('VITE_USER_TEST', 'true')
    vi.stubEnv('VITE_USER_TEST_COHORT', 'test-round')
    expect(chatGoesToExperience()).toBe(false)
    startSession({ accessToken: 'a', refreshToken: 'r' })
    startParticipant(12, { onboardingCompleted: true, surveyCompleted: true })
    expect(chatGoesToExperience()).toBe(true)
  })
})

function Path() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

describe('experience run (no sign-in, no request)', () => {
  it('keeps the same person’s answers and drops only the match when picking another roommate', () => {
    useExperienceBuild()
    setAppMode('experience')
    startNewParticipant('booth')
    updateExperienceSession((session) => ({
      ...session,
      priorities: ['cleaning', 'smoking', 'sleep-habit'],
      answers: { 0: '자주 있다는 말을 들었다' },
    }))
    startExperienceChat({ ...PARTNER, adjust: ['청소'] })
    const id = getExperienceSession()!.id

    pickAnotherRoommate()
    expect(getExperienceSession()).toMatchObject({
      id,
      attempt: 1,
      priorities: ['cleaning', 'smoking', 'sleep-habit'],
      answers: { 0: '자주 있다는 말을 들었다' },
      chat: null,
      matched: null,
      passedCandidateIds: ['hyena'],
    })

    // 처음부터 forgets them again.
    restartAttempt()
    expect(getExperienceSession()!.passedCandidateIds).toEqual([])
  })

  it('ends a matched chat with only 홈으로 가기, and can still drop that roommate from the list', async () => {
    useExperienceBuild()
    setAppMode('experience')
    startNewParticipant('booth')
    updateExperienceSession((session) => ({
      ...session,
      priorities: ['cleaning', 'smoking', 'sleep-habit'],
    }))
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(
      <MemoryRouter initialEntries={['/roommate/hyena']}>
        <AppRoutes />
        <Path />
      </MemoryRouter>,
    )
    fireEvent.click(
      await screen.findByRole('button', { name: '대화 요청하기' }),
    )
    fireEvent.click(screen.getByRole('button', { name: '대화 시작하기' }))
    fireEvent.click(
      screen.getByRole('button', { name: '주 1회 함께 청소하면 좋겠어요' }),
    )
    await act(async () => {
      vi.advanceTimersByTime(AUTO_REPLY_MS)
    })
    fireEvent.click(screen.getByRole('button', { name: '그렇게 해요' }))
    fireEvent.click(screen.getByRole('button', { name: '매칭확정 하기' }))
    fireEvent.click(screen.getByRole('button', { name: '확정하기' }))
    await act(async () => {
      vi.advanceTimersByTime(AUTO_REPLY_MS)
    })
    expect(screen.getByText('🎉 매칭이 확정되었습니다')).toBeInTheDocument()

    // 처음부터 and 다음 참가자 left the end of the chat (requested 2026-11-20); the presenter
    // menu keeps its own.
    expect(
      screen.queryByRole('button', { name: '처음부터' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '다음 참가자' }),
    ).not.toBeInTheDocument()

    // Trying another roommate (pickAnotherRoommate) keeps the person and drops the match.
    fireEvent.click(screen.getByRole('button', { name: '홈으로 가기' }))
    act(() => pickAnotherRoommate())
    fireEvent.click(screen.getByRole('link', { name: '룸메이트' }))
    expect(screen.getByTestId('path').textContent).toBe('/roommate')
    expect(getExperienceSession()!.priorities).toEqual([
      'cleaning',
      'smoking',
      'sleep-habit',
    ])
    const hyena = getCandidate('hyena')!
    const list = screen.getByTestId('roommate-list')
    expect(list).not.toHaveTextContent(hyena.name)
    const others = getCandidates().filter(({ id }) => id !== 'hyena')
    expect(list).toHaveTextContent(others[0].name)
    // The home no longer shows the earlier match.
    expect(getExperienceSession()!.matched).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('goes from the analysis through the chat to the matched home', async () => {
    useExperienceBuild()
    setAppMode('experience')
    startNewParticipant('booth')
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(
      <MemoryRouter initialEntries={['/roommate/hyena']}>
        <AppRoutes />
        <Path />
      </MemoryRouter>,
    )

    fireEvent.click(
      await screen.findByRole('button', { name: '대화 요청하기' }),
    )
    expect(
      screen.getByRole('dialog', { name: '대화방이 열렸어요!' }),
    ).toHaveAccessibleDescription(/실제로는 전송되지 않아요/)
    fireEvent.click(screen.getByRole('button', { name: '대화 시작하기' }))
    expect(screen.getByTestId('path').textContent).toBe('/experience/chat')

    fireEvent.click(
      screen.getByRole('button', { name: '주 1회 함께 청소하면 좋겠어요' }),
    )
    // A second press cannot add a second reply.
    expect(
      screen.queryByRole('button', { name: '주 1회 함께 청소하면 좋겠어요' }),
    ).not.toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(AUTO_REPLY_MS)
    })
    expect(
      screen.getAllByText('좋아요. 대신 음식물 쓰레기는 그날 치우면 좋겠어요'),
    ).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '그렇게 해요' }))
    // The agreement card (확정) offers the final choice, as in the chat room.
    fireEvent.click(screen.getByRole('button', { name: '매칭확정 하기' }))
    fireEvent.click(screen.getByRole('button', { name: '확정하기' }))
    // Only my choice: not matched until the partner chooses too.
    expect(
      screen.queryByText('🎉 매칭이 확정되었습니다'),
    ).not.toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(AUTO_REPLY_MS)
    })
    expect(screen.getByText('🎉 매칭이 확정되었습니다')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '홈으로 가기' }))
    expect(screen.getByTestId('path').textContent).toBe('/home')
    expect(
      screen.getByText(/즐거운 기숙사 생활이 되길 바라요/),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('stops the partner’s scheduled reply when the chat closes', async () => {
    useExperienceBuild()
    setAppMode('experience')
    startNewParticipant('booth')
    startExperienceChat({ ...PARTNER, adjust: ['청소'] })
    vi.useFakeTimers()
    const view = render(
      <MemoryRouter initialEntries={['/experience/chat']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    fireEvent.click(
      screen.getByRole('button', { name: '주 1회 함께 청소하면 좋겠어요' }),
    )
    view.unmount()
    act(() => {
      vi.advanceTimersByTime(AUTO_REPLY_MS * 2)
    })
    expect(getExperienceSession()!.chat!.phase).toBe('partner-replying')
    // Opened again, it answers once.
    dispatchExperienceChat({ type: 'auto', step: -1 })
    expect(getExperienceSession()!.chat!.phase).toBe('partner-replying')
  })
})
