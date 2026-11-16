import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { clearTokens, startSession } from '../../lib/auth/tokenStore'
import { profileData } from '../../test/surveyFixture'

/**
 * The home's match status in server mode (`GET /api/matchings/me`, 채희 spec 7.6, 7.13) against
 * a fake server in snake_case. Ids and names are test values, not data from the real server.
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
const fail = (status: number, code: string, message: string) =>
  json(status, { success: false, code, message, errors: {} })

type Call = { method: string; path: string }
let calls: Call[]
type Handler = (call: Call) => Response | Promise<Response> | undefined
let handler: Handler

const roomsCalls = () =>
  calls.filter((call) => call.path === '/api/matchings/me')

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

const NICKNAME = '민지'
const BEFORE_HEADING = new RegExp(
  `안녕하세요 ${NICKNAME}님.*어떤 룸메이트가 찾아올까요\\?`,
)
const MATCHED_HEADING = new RegExp(
  `안녕하세요 ${NICKNAME}님 룸메이트와.*즐거운 기숙사 생활이 되길 바라요!`,
)
const BEFORE_BUBBLE = '같이 살게 될까?'
const MATCHED_BUBBLE = '만나게 되어 기뻐!'

const room = (id: number, status: 'CHATTING' | 'CONFIRMED') => ({
  matching_id: id,
  partner: {
    user_id: 100 + id,
    nickname: `상대${id}`,
    top_categories: ['SMOKING'],
  },
  status,
  last_message: null,
  last_message_at: null,
})

/** The profile for the greeting and the unread count, plus `rooms` for the match status. */
function homeServer(rooms: () => unknown[] | Promise<Response>): Handler {
  return (call) => {
    if (call.path === '/api/me/profile') {
      return ok(profileData({ nickname: NICKNAME }))
    }
    if (call.path === '/api/notifications/unread-count') return ok({ count: 0 })
    if (call.path === '/api/matchings/me') {
      const answer = rooms()
      return answer instanceof Promise ? answer : ok({ rooms: answer })
    }
  }
}

/** A response that answers only when `release` is called. */
function held() {
  let release: (response: Response) => void = () => {}
  const promise = new Promise<Response>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

const bubble = (text: string) =>
  screen.getByText(text).closest('div') as HTMLElement
const greeting = () => document.querySelector('h1') as HTMLElement

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
      }
      calls.push(call)
      // The stored session is checked once when the app starts.
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
  // A new session each test, so no status is remembered from another test.
  startSession({ accessToken: 'access-1', refreshToken: 'refresh-1' })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  clearTokens()
})

describe('home match status (server mode)', () => {
  it('shows the before-match copy without any room', async () => {
    handler = homeServer(() => [])
    renderAt('/home')

    expect(
      await screen.findByRole('heading', { name: BEFORE_HEADING }),
    ).toBeInTheDocument()
    expect(bubble(BEFORE_BUBBLE)).not.toHaveClass('invisible')
    expect(screen.queryByText(MATCHED_BUBBLE)).toBeNull()
    expect(roomsCalls()).toHaveLength(1)
  })

  it('stays before a match while chatting, even with my own final choice made', async () => {
    // The room list has no confirmation flags: one person's choice keeps the room CHATTING.
    handler = homeServer(() => [room(45, 'CHATTING'), room(46, 'CHATTING')])
    renderAt('/home')

    expect(
      await screen.findByRole('heading', { name: BEFORE_HEADING }),
    ).toBeInTheDocument()
    expect(screen.queryByText(MATCHED_BUBBLE)).toBeNull()
  })

  it('shows the matched copy with the signed-in nickname for a CONFIRMED room', async () => {
    handler = homeServer(() => [room(46, 'CHATTING'), room(45, 'CONFIRMED')])
    renderAt('/home')

    expect(
      await screen.findByRole('heading', { name: MATCHED_HEADING }),
    ).toBeInTheDocument()
    expect(bubble(MATCHED_BUBBLE)).not.toHaveClass('invisible')
    expect(screen.queryByText(BEFORE_BUBBLE)).toBeNull()
  })

  it('shows neither copy while the first answer is checked', async () => {
    const answer = held()
    handler = homeServer(() => answer.promise)
    renderAt('/home')

    // The profile has arrived, but the match status has not.
    await waitFor(() => expect(roomsCalls()).toHaveLength(1))
    await act(async () => {})
    // jsdom applies no Tailwind CSS, so the hidden state is read from the class.
    expect(greeting()).toHaveClass('invisible')
    expect(bubble(BEFORE_BUBBLE)).toHaveClass('invisible')
    expect(screen.queryByText(MATCHED_BUBBLE)).toBeNull()

    await act(async () => {
      answer.release(ok({ rooms: [room(45, 'CONFIRMED')] }))
    })
    expect(
      await screen.findByRole('heading', { name: MATCHED_HEADING }),
    ).toBeInTheDocument()
    expect(greeting()).not.toHaveClass('invisible')
    expect(bubble(MATCHED_BUBBLE)).not.toHaveClass('invisible')
  })

  it('falls back to the before-match copy when the first read fails', async () => {
    handler = homeServer(() =>
      Promise.resolve(fail(500, 'INTERNAL_SERVER_ERROR', '서버 오류입니다.')),
    )
    renderAt('/home')

    expect(
      await screen.findByRole('heading', { name: BEFORE_HEADING }),
    ).toBeInTheDocument()
  })

  it('keeps the matched copy on the way back, reads again, and follows a change', async () => {
    let rooms: unknown[] | Promise<Response> = [room(45, 'CONFIRMED')]
    handler = (call) =>
      call.path === '/api/matchings/me' && rooms instanceof Promise
        ? rooms
        : call.path === '/api/matchings/me'
          ? ok({ rooms })
          : homeServer(() => [])(call)
    renderAt('/home')
    expect(
      await screen.findByRole('heading', { name: MATCHED_HEADING }),
    ).toBeInTheDocument()

    // Away and back: the last answer shows at once while the home asks again.
    const second = held()
    rooms = second.promise
    fireEvent.click(screen.getByRole('link', { name: '마이' }))
    await waitFor(() => expect(path()).toBe('/my'))
    fireEvent.click(screen.getByRole('link', { name: '홈' }))
    await waitFor(() => expect(path()).toBe('/home'))
    expect(
      screen.getByRole('heading', { name: MATCHED_HEADING }),
    ).toBeInTheDocument()
    await waitFor(() => expect(roomsCalls()).toHaveLength(2))

    // No longer confirmed on the server: back to the before-match copy.
    await act(async () => {
      second.release(ok({ rooms: [] }))
    })
    expect(
      await screen.findByRole('heading', { name: BEFORE_HEADING }),
    ).toBeInTheDocument()
  })

  it('checks again in a new session instead of showing the previous one', async () => {
    handler = homeServer(() => [room(45, 'CONFIRMED')])
    const first = renderAt('/home')
    expect(
      await screen.findByRole('heading', { name: MATCHED_HEADING }),
    ).toBeInTheDocument()
    first.unmount()

    // Another sign-in (or a reload, which starts with nothing remembered).
    clearTokens()
    startSession({ accessToken: 'access-b', refreshToken: 'refresh-b' })
    const answer = held()
    handler = homeServer(() => answer.promise)
    renderAt('/home')

    await waitFor(() => expect(roomsCalls()).toHaveLength(2))
    await act(async () => {})
    expect(screen.queryByText(MATCHED_BUBBLE)).toBeNull()
    expect(greeting()).toHaveClass('invisible')
    expect(bubble(BEFORE_BUBBLE)).toHaveClass('invisible')

    await act(async () => {
      answer.release(ok({ rooms: [] }))
    })
    expect(
      await screen.findByRole('heading', { name: BEFORE_HEADING }),
    ).toBeInTheDocument()
  })

  it('becomes matched after both final choices in the chat room', async () => {
    let confirmed = false
    const chatRoom = () => ({
      matching_id: 45,
      status: confirmed ? 'CONFIRMED' : 'CHATTING',
      end_reason: null,
      partner: {
        user_id: 112,
        nickname: '상대45',
        department: '컴퓨터공학과',
        top_categories: ['SMOKING'],
      },
      agendas: [],
      my_confirmed: confirmed,
      // The partner chose first, so my choice completes the match.
      partner_confirmed: true,
    })
    handler = (call) => {
      if (call.path === '/api/matchings/45') return ok(chatRoom())
      if (call.path.startsWith('/api/matchings/45/messages?')) {
        return ok({ messages: [], has_more: false })
      }
      if (call.path === '/api/matchings/45/confirm') {
        confirmed = true
        return ok({
          matching_id: 45,
          status: 'CONFIRMED',
          my_confirmed: true,
          partner_confirmed: true,
        })
      }
      return homeServer(() => [room(45, confirmed ? 'CONFIRMED' : 'CHATTING')])(
        call,
      )
    }
    renderAt('/home')
    expect(
      await screen.findByRole('heading', { name: BEFORE_HEADING }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: '채팅' }))
    fireEvent.click(await screen.findByRole('link', { name: /상대45/ }))
    fireEvent.click(
      await screen.findByRole('button', { name: '매칭확정 하기' }),
    )
    fireEvent.click(screen.getByRole('button', { name: '확정하기' }))
    expect(
      await screen.findByText('🎉 매칭이 확정되었습니다'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('link', { name: '채팅 목록으로 돌아가기' }),
    )
    await waitFor(() => expect(path()).toBe('/chat'))
    fireEvent.click(screen.getByRole('link', { name: '홈' }))

    expect(
      await screen.findByRole('heading', { name: MATCHED_HEADING }),
    ).toBeInTheDocument()
    expect(screen.getByText(MATCHED_BUBBLE)).toBeInTheDocument()
  })

  it('keeps the dev preview fixed and asks nothing for it', async () => {
    handler = homeServer(() => [])
    renderAt('/dev/home/matched')

    expect(await screen.findByText(MATCHED_BUBBLE)).toBeInTheDocument()
    expect(greeting()).not.toHaveClass('invisible')
    expect(roomsCalls()).toHaveLength(0)
  })
})
