import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../app/AppRoutes'
import { clearTokens, startSession } from '../lib/auth/tokenStore'

/**
 * Server mode (`VITE_API_MODE=server`) against a fake server that answers in the snake_case of
 * the 채희 spec. Ids and names are test values, not data from the real server.
 */

const BASE = 'https://api.example.test'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
const ok = (data: unknown) =>
  json(200, { success: true, code: 'OK', message: '성공', data })
const fail = (status: number, code: string, message: string, errors = {}) =>
  json(status, { success: false, code, message, errors })

type Call = { method: string; path: string; body: unknown }
let calls: Call[]
type Handler = (call: Call) => Response | Promise<Response> | undefined
let handler: Handler

const callsTo = (method: string, path: string | RegExp) =>
  calls.filter(
    (call) =>
      call.method === method &&
      (typeof path === 'string' ? call.path === path : path.test(call.path)),
  )

function LocationProbe() {
  return <output data-testid="path">{useLocation().pathname}</output>
}
const path = () => screen.getByTestId('path').textContent

function renderAt(at: string) {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  )
}

const recommendation = (id: number, score: number | null, extra = {}) => ({
  user_id: id,
  nickname: `후보${id}`,
  department: '컴퓨터공학과',
  age: 21,
  top_categories: ['SMOKING', 'CLEANING', 'PERSONAL_HYGIENE'],
  match_score: score,
  relation: 'NONE',
  ...extra,
})

beforeEach(() => {
  vi.stubEnv('VITE_API_MODE', 'server')
  vi.stubEnv('VITE_API_BASE_URL', BASE)
  calls = []
  handler = () => undefined
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const call = {
        method: init.method ?? 'GET',
        path: url.slice(BASE.length),
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      }
      calls.push(call)
      if (call.path === '/api/auth/refresh') {
        return ok({
          access_token: 'access-2',
          token_type: 'Bearer',
          expires_in: 1800,
          refresh_token: 'refresh-2',
          refresh_expires_in: 1209600,
        })
      }
      const response = await handler(call)
      if (!response) throw new Error(`unexpected ${call.method} ${call.path}`)
      return response
    }),
  )
  clearTokens()
  startSession({ accessToken: 'access-1', refreshToken: 'refresh-1' })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  clearTokens()
})

describe('recommendations', () => {
  it('keeps the server order, tells 0% from 정보 부족, and shows more without asking again', async () => {
    const list = [
      recommendation(12, 82),
      recommendation(13, 0),
      recommendation(14, 70),
      recommendation(15, 60),
      recommendation(16, 50),
      recommendation(17, null),
    ]
    handler = (call) =>
      call.path === '/api/recommendations'
        ? ok({ recommendations: list, total_count: list.length })
        : undefined
    renderAt('/roommate')

    const cards = await screen.findAllByRole('link', { name: /후보\d+/ })
    expect(cards.map((card) => card.getAttribute('href'))).toEqual([
      '/roommate/12',
      '/roommate/13',
      '/roommate/14',
      '/roommate/15',
      '/roommate/16',
    ])
    expect(cards[1]).toHaveTextContent('매칭률 0%')

    fireEvent.click(screen.getByRole('button', { name: /리스트 더보기/ }))
    const last = screen.getByRole('link', { name: /후보17/ })
    expect(last).toHaveTextContent('매칭률 정보 부족')
    expect(screen.queryByRole('button', { name: /리스트 더보기/ })).toBeNull()
    expect(callsTo('GET', '/api/recommendations')).toHaveLength(1)
  })

  it('says nothing changed on a refresh with changed: false', async () => {
    handler = (call) => {
      if (call.path === '/api/recommendations') {
        return ok({ recommendations: [recommendation(12, 82)], total_count: 1 })
      }
      if (call.path === '/api/recommendations/refresh') {
        return ok({
          changed: false,
          recommendations: [recommendation(12, 82)],
          total_count: 1,
        })
      }
    }
    renderAt('/roommate')
    await screen.findByRole('link', { name: /후보12/ })

    fireEvent.click(screen.getByRole('button', { name: /새로고침/ }))
    expect(
      await screen.findByText('변경된 사항이 없습니다'),
    ).toBeInTheDocument()
    expect(callsTo('POST', '/api/recommendations/refresh')).toHaveLength(1)
  })

  it('shows the empty state and a retry after a failure', async () => {
    let attempt = 0
    handler = (call) => {
      if (call.path !== '/api/recommendations') return undefined
      attempt += 1
      return attempt === 1
        ? fail(409, 'ONBOARDING_REQUIRED', '온보딩을 먼저 완료해주세요.')
        : ok({ recommendations: [], total_count: 0 })
    }
    renderAt('/roommate')

    expect(
      await screen.findByText('온보딩을 먼저 완료해주세요.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(
      await screen.findByText('아직 추천할 수 있는 후보가 없어요'),
    ).toBeInTheDocument()
  })
})

describe('match analysis and chat request', () => {
  const analysis = {
    target: {
      user_id: 12,
      nickname: '민수정',
      age: 21,
      department: '소프트웨어학과',
      top_categories: ['SMOKING', 'CLEANING', 'PERSONAL_HYGIENE'],
    },
    match_score: 87,
    good_points: ['소등 시간이 비슷해요.'],
    adjust_points: ['식기 정리 시점이 달라요.'],
    check_points: [],
    analyzed_at: '2026-11-10T12:03:00Z',
  }

  it('hides an empty section and sends receiver_id to open the new room', async () => {
    handler = (call) => {
      if (call.path === '/api/recommendations/12/analysis') return ok(analysis)
      if (call.path === '/api/matchings' && call.method === 'POST') {
        return ok({
          matching_id: 45,
          status: 'CHATTING',
          created_at: '2026-11-10T12:03:00Z',
        })
      }
      if (call.path === '/api/recommendations') {
        return ok({ recommendations: [], total_count: 0 })
      }
    }
    renderAt('/roommate/12')

    expect(
      await screen.findByText('민수정님과의 나의 매칭결과'),
    ).toBeInTheDocument()
    expect(screen.getByText('소등 시간이 비슷해요.')).toBeInTheDocument()
    expect(screen.queryByText('아직 확인이 필요해요')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '대화 요청하기' }))
    fireEvent.click(await screen.findByRole('button', { name: '대화창 이동' }))
    expect(callsTo('POST', '/api/matchings')[0].body).toEqual({
      receiver_id: 12,
    })
    expect(path()).toBe('/chat/45')
  })

  it('opens the existing room on ALREADY_CHATTING', async () => {
    handler = (call) => {
      if (call.path === '/api/recommendations/12/analysis') return ok(analysis)
      if (call.path === '/api/matchings' && call.method === 'POST') {
        return fail(409, 'ALREADY_CHATTING', '이미 대화 중인 상대입니다.', {
          matching_id: '45',
        })
      }
      if (call.path === '/api/recommendations') {
        return ok({ recommendations: [], total_count: 0 })
      }
    }
    renderAt('/roommate/12')

    fireEvent.click(
      await screen.findByRole('button', { name: '대화 요청하기' }),
    )
    expect(
      await screen.findByRole('dialog', { name: '이미 대화 중인 상대예요' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '대화창 이동' }))
    expect(path()).toBe('/chat/45')
  })

  it('shows the reason for a refused request', async () => {
    handler = (call) => {
      if (call.path === '/api/recommendations/12/analysis') return ok(analysis)
      if (call.path === '/api/matchings' && call.method === 'POST') {
        return fail(
          409,
          'MATCHING_ENDED_PAIR',
          '매칭을 중지한 상대에게는 다시 신청할 수 없습니다.',
        )
      }
      if (call.path === '/api/recommendations') {
        return ok({ recommendations: [], total_count: 0 })
      }
    }
    renderAt('/roommate/12')

    fireEvent.click(
      await screen.findByRole('button', { name: '대화 요청하기' }),
    )
    expect(
      await screen.findByRole('dialog', {
        name: '매칭을 중지한 상대에게는 다시 신청할 수 없습니다.',
      }),
    ).toBeInTheDocument()
  })
})

describe('chat room', () => {
  const ME = 7
  const PARTNER = 12
  const room = (extra = {}) => ({
    matching_id: 45,
    status: 'CHATTING',
    end_reason: null,
    partner: {
      user_id: PARTNER,
      nickname: '민트초코',
      department: '컴퓨터공학과',
      top_categories: ['SMOKING'],
    },
    agendas: [
      {
        agenda_id: 101,
        seq: 1,
        title: '밤 12시 이후 깨어 있기',
        content: '몇 시까지 불을 켜둘까요?',
        status: 'DISCUSSING',
        rule_summary: null,
      },
      {
        agenda_id: 102,
        seq: 2,
        title: '식기 정리',
        content: '언제까지 정리할까요?',
        status: 'WAITING',
        rule_summary: null,
      },
    ],
    my_confirmed: false,
    partner_confirmed: false,
    ...extra,
  })
  const message = (
    id: number,
    type: 'USER' | 'AI' | 'SYSTEM',
    content: string,
    senderId: number | null = null,
  ) => ({
    message_id: id,
    type,
    sender_id: senderId,
    content,
    agenda_id: 101,
    created_at: '2026-11-10T12:00:00Z',
  })

  it('tells my messages from the partner’s, polls after the largest id, and keeps the cursor on send', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let roomReads = 0
    const polls: string[] = []
    let pollAnswer: unknown[] = []
    handler = (call) => {
      if (call.path === '/api/me/profile') return ok({ user_id: ME })
      if (call.path === '/api/matchings/45') {
        roomReads += 1
        return ok(room())
      }
      if (
        call.method === 'GET' &&
        call.path.startsWith('/api/matchings/45/messages?')
      ) {
        const query = new URLSearchParams(call.path.split('?')[1])
        if (query.has('after_id')) {
          polls.push(query.get('after_id') ?? '')
          const answer = pollAnswer
          pollAnswer = []
          return ok({ messages: answer })
        }
        expect(query.has('before_id')).toBe(false)
        return ok({
          messages: [
            message(148, 'AI', '첫 번째 안건이에요.'),
            message(149, 'USER', '저는 12시쯤 자요.', ME),
            message(150, 'USER', '저도 비슷해요.', PARTNER),
          ],
          has_more: false,
        })
      }
      if (
        call.method === 'POST' &&
        call.path === '/api/matchings/45/messages'
      ) {
        return ok(message(152, 'USER', '좋아요', ME))
      }
    }
    renderAt('/chat/45')

    const log = await screen.findByRole('list', { name: '대화 내용' })
    expect(
      within(log).getByText('1. 밤 12시 이후 깨어 있기'),
    ).toBeInTheDocument()
    expect(within(log).getByText('첫 번째 안건이에요.')).toBeInTheDocument()
    expect(
      within(log).getByText('저는 12시쯤 자요.').closest('li'),
    ).toHaveTextContent('나')
    expect(
      within(log).getByText('저도 비슷해요.').closest('li'),
    ).toHaveTextContent('민트초코')

    // A message from the partner lands while mine is on its way.
    pollAnswer = [message(151, 'USER', '몇 시가 좋아요?', PARTNER)]
    fireEvent.change(screen.getByRole('textbox', { name: '메시지 입력' }), {
      target: { value: '좋아요' },
    })
    fireEvent.click(screen.getByRole('button', { name: '메시지 보내기' }))
    expect(await within(log).findByText('좋아요')).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(2500))
    expect(await within(log).findByText('몇 시가 좋아요?')).toBeInTheDocument()
    // The first poll asks after 150, not after the sent 152.
    expect(polls[0]).toBe('150')

    // The poll repeats my message: it shows once, and a SYSTEM message reads the room again.
    pollAnswer = [
      message(152, 'USER', '좋아요', ME),
      message(153, 'SYSTEM', '민트초코님이 안건을 확정했어요.'),
    ]
    const before = roomReads
    await act(() => vi.advanceTimersByTimeAsync(2500))
    expect(
      await within(log).findByText('민트초코님이 안건을 확정했어요.'),
    ).toBeInTheDocument()
    expect(within(log).getAllByText('좋아요')).toHaveLength(1)
    expect(polls[1]).toBe('151')
    await waitFor(() => expect(roomReads).toBe(before + 1))
  })

  it('decides the agenda, opens the final dialog on all_decided, and waits for the partner', async () => {
    let decided = false
    let confirmed = false
    handler = (call) => {
      if (call.path === '/api/me/profile') return ok({ user_id: ME })
      if (call.path === '/api/matchings/45') {
        return ok(
          room({
            agendas: decided ? [] : room().agendas,
            my_confirmed: confirmed,
          }),
        )
      }
      if (call.path.startsWith('/api/matchings/45/messages?')) {
        return ok({ messages: [], has_more: false })
      }
      if (call.path === '/api/matchings/45/agendas/101/decide') {
        decided = true
        return ok({
          agenda_id: 101,
          status: 'DECIDED',
          decided_by: ME,
          next_agenda_id: null,
          all_decided: true,
        })
      }
      if (call.path === '/api/matchings/45/confirm') {
        confirmed = true
        return ok({
          matching_id: 45,
          status: 'CHATTING',
          my_confirmed: true,
          partner_confirmed: false,
        })
      }
    }
    renderAt('/chat/45')

    fireEvent.click(await screen.findByRole('button', { name: '다음안건으로' }))
    fireEvent.click(screen.getByRole('button', { name: '확정하기' }))
    expect(
      await screen.findByRole('dialog', { name: '매칭을 확정하시겠습니까?' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '확정하기' }))

    expect(
      await screen.findByRole('button', { name: '상대 확정 대기 중' }),
    ).toBeDisabled()
    expect(screen.queryByText('🎉 매칭이 확정되었습니다')).toBeNull()
    expect(callsTo('PATCH', '/api/matchings/45/confirm')).toHaveLength(1)
  })

  it('locks an ended room and does not poll it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    handler = (call) => {
      if (call.path === '/api/me/profile') return ok({ user_id: ME })
      if (call.path === '/api/matchings/45') {
        return ok(room({ status: 'ENDED', end_reason: 'PARTNER_MATCHED' }))
      }
      if (call.path.startsWith('/api/matchings/45/messages?')) {
        return ok({ messages: [], has_more: false })
      }
    }
    renderAt('/chat/45')

    expect(
      await screen.findByText('상대가 다른 분과 매칭이 완료되었어요'),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeDisabled()
    await act(() => vi.advanceTimersByTimeAsync(10_000))
    expect(callsTo('GET', /after_id=/)).toHaveLength(0)
  })

  it('shows a room the user is not in without a retry', async () => {
    handler = (call) => {
      if (call.path === '/api/me/profile') return ok({ user_id: ME })
      if (call.path.startsWith('/api/matchings/45')) {
        return fail(403, 'MATCHING_FORBIDDEN', '참여하지 않은 매칭입니다.')
      }
    }
    renderAt('/chat/45')

    expect(
      await screen.findByText('참여하지 않은 매칭입니다.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull()
  })
})

describe('notifications', () => {
  const notification = (id: number, createdAt: string, isRead = false) => ({
    notification_id: id,
    type: 'CHAT_REQUESTED',
    content: `알림${id}님과의 매칭이 시작되었어요`,
    matching_id: 45,
    is_read: isRead,
    created_at: createdAt,
  })

  it('splits today in Seoul time, pages with has_next, and reads a notification before opening its room', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    // 00:30 in Seoul on 11-13 is 15:30 UTC on 11-12.
    vi.setSystemTime(new Date('2026-11-12T15:30:00Z'))
    handler = (call) => {
      if (call.path === '/api/notifications?page=0&size=20') {
        return ok({
          notifications: [
            notification(302, '2026-11-12T15:10:00Z'),
            notification(301, '2026-11-12T14:50:00Z', true),
          ],
          page: 0,
          has_next: true,
        })
      }
      if (call.path === '/api/notifications?page=1&size=20') {
        return ok({
          notifications: [notification(300, '2026-11-10T10:00:00Z', true)],
          page: 1,
          has_next: false,
        })
      }
      if (call.path === '/api/notifications/302/read') {
        return ok({ notification_id: 302, is_read: true })
      }
    }
    renderAt('/notifications')

    const today = (await screen.findByRole('heading', { name: '오늘' }))
      .parentElement as HTMLElement
    expect(
      await within(today).findByText('알림302님과의 매칭이 시작되었어요'),
    ).toBeInTheDocument()
    expect(within(today).getByText('새 알림')).toBeInTheDocument()
    const earlier = screen.getByRole('heading', { name: '이전 알림' })
      .parentElement as HTMLElement
    expect(
      within(earlier).getByText('알림301님과의 매칭이 시작되었어요'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '더보기' }))
    expect(
      await within(earlier).findByText('알림300님과의 매칭이 시작되었어요'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '더보기' })).toBeNull()

    fireEvent.click(within(today).getByRole('button', { name: /알림302님/ }))
    await waitFor(() => expect(path()).toBe('/chat/45'))
    expect(callsTo('PATCH', '/api/notifications/302/read')).toHaveLength(1)
  })

  it('shows the red dot on the home bell for an unread count', async () => {
    handler = (call) =>
      call.path === '/api/notifications/unread-count'
        ? ok({ count: 3 })
        : undefined
    renderAt('/home')

    expect(
      await screen.findByRole('link', { name: '알림, 새 알림 있음' }),
    ).toBeInTheDocument()
  })
})
