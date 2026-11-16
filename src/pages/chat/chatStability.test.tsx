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
import AppRoutes from '../../app/AppRoutes'
import { clearTokens, startSession } from '../../lib/auth/tokenStore'

/**
 * Server chat room stability (integration QA 3, 4, 5) against a fake server in the snake_case of
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
const fail = (status: number, code: string, message: string) =>
  json(status, { success: false, code, message, errors: {} })

type Call = { method: string; path: string; body: unknown }
let calls: Call[]
type Handler = (call: Call) => Response | Promise<Response> | undefined
let extra: Handler

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

const ME = 7
const PARTNER = 12

let roomState: Record<string, unknown>
let nextPoll: unknown[]

const baseRoom = () => ({
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
  ],
  my_confirmed: false,
  partner_confirmed: false,
})

const message = (
  id: number,
  type: 'USER' | 'SYSTEM',
  content: string,
  senderId: number | null = null,
) => ({
  message_id: id,
  type,
  sender_id: senderId,
  content,
  agenda_id: null,
  created_at: '2026-11-16T12:00:00Z',
})

/** A response that answers only when `release` is called. */
function held() {
  let release: (response: Response) => void = () => {}
  const promise = new Promise<Response>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

beforeEach(() => {
  vi.stubEnv('VITE_API_MODE', 'server')
  vi.stubEnv('VITE_API_BASE_URL', BASE)
  calls = []
  extra = () => undefined
  roomState = baseRoom()
  nextPoll = []
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
      const answer = await extra(call)
      if (answer) return answer
      if (call.path === '/api/me/profile') return ok({ user_id: ME })
      if (call.path === '/api/matchings/45') return ok(roomState)
      if (call.path === '/api/matchings/me') return ok({ rooms: [] })
      if (
        call.method === 'GET' &&
        call.path.startsWith('/api/matchings/45/messages?')
      ) {
        if (call.path.includes('after_id=')) {
          const messages = nextPoll
          nextPoll = []
          return ok({ messages })
        }
        return ok({ messages: [], has_more: false })
      }
      throw new Error(`unexpected ${call.method} ${call.path}`)
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

async function openRoom() {
  render(
    <MemoryRouter initialEntries={['/chat/45']}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  )
  return screen.findByRole('textbox', { name: '메시지 입력' })
}

const log = () => screen.getByRole('list', { name: '대화 내용' })
const type = (input: HTMLElement, value: string) =>
  fireEvent.change(input, { target: { value } })
const sendButton = () => screen.getByRole('button', { name: '메시지 보내기' })
const dialog = (name: string) => screen.queryByRole('dialog', { name })

describe('QA 3: leaving the room sends one end request', () => {
  it('sends one request for a fast double click and blocks the button while it is out', async () => {
    const answer = held()
    extra = (call) =>
      call.path === '/api/matchings/45/end' ? answer.promise : undefined
    await openRoom()

    fireEvent.click(screen.getByRole('button', { name: '채팅 종료하기' }))
    const leave = screen.getByRole('button', { name: '나가기' })
    fireEvent.click(leave)
    fireEvent.click(leave)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: '나가기' }))
    await act(async () => {})

    expect(callsTo('PATCH', '/api/matchings/45/end')).toHaveLength(1)
    expect(screen.getByRole('button', { name: '나가기' })).toBeDisabled()

    // A slow answer still ends in the list, as before.
    await act(async () => {
      answer.release(
        ok({ matching_id: 45, status: 'ENDED', end_reason: 'USER_ENDED' }),
      )
    })
    await waitFor(() => expect(path()).toBe('/chat'))
    expect(callsTo('PATCH', '/api/matchings/45/end')).toHaveLength(1)
  })

  it('sends one request even for two taps before the button is redrawn', async () => {
    const answer = held()
    extra = (call) =>
      call.path === '/api/matchings/45/end' ? answer.promise : undefined
    await openRoom()

    fireEvent.click(screen.getByRole('button', { name: '채팅 종료하기' }))
    const leave = screen.getByRole('button', { name: '나가기' })
    // Both taps land in one batch, so the disabled button is not drawn yet.
    act(() => {
      leave.click()
      leave.click()
    })
    await act(async () => {})
    expect(callsTo('PATCH', '/api/matchings/45/end')).toHaveLength(1)

    await act(async () => {
      answer.release(
        ok({ matching_id: 45, status: 'ENDED', end_reason: 'USER_ENDED' }),
      )
    })
    await waitFor(() => expect(path()).toBe('/chat'))
  })

  it('shows the error after a failure and lets the user try again', async () => {
    let attempts = 0
    extra = (call) => {
      if (call.path !== '/api/matchings/45/end') return undefined
      attempts += 1
      return attempts === 1
        ? fail(500, 'INTERNAL_SERVER_ERROR', '서버 오류입니다.')
        : ok({ matching_id: 45, status: 'ENDED', end_reason: 'USER_ENDED' })
    }
    await openRoom()

    fireEvent.click(screen.getByRole('button', { name: '채팅 종료하기' }))
    fireEvent.click(screen.getByRole('button', { name: '나가기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '서버 오류입니다.',
    )
    expect(path()).toBe('/chat/45')

    fireEvent.click(screen.getByRole('button', { name: '채팅 종료하기' }))
    const leave = screen.getByRole('button', { name: '나가기' })
    expect(leave).toBeEnabled()
    fireEvent.click(leave)
    await waitFor(() => expect(path()).toBe('/chat'))
    expect(callsTo('PATCH', '/api/matchings/45/end')).toHaveLength(2)
  })
})

describe('QA 4: a new draft survives the previous send', () => {
  it('keeps what was typed while the first message was being sent', async () => {
    const answer = held()
    extra = (call) =>
      call.method === 'POST' && call.path === '/api/matchings/45/messages'
        ? answer.promise
        : undefined
    const input = await openRoom()

    type(input, '첫 메시지')
    fireEvent.click(sendButton())
    // Typing goes on while it is out, with edits.
    type(input, '두')
    type(input, '두 번째')
    type(input, '두 번째 메시지')

    await act(async () => {
      answer.release(ok(message(9, 'USER', '첫 메시지', ME)))
    })
    expect(await within(log()).findByText('첫 메시지')).toBeInTheDocument()
    expect(input).toHaveValue('두 번째 메시지')
    expect(callsTo('POST', '/api/matchings/45/messages')).toHaveLength(1)
  })

  it('keeps a new draft even when it is the same text as the message being sent', async () => {
    const answer = held()
    extra = (call) =>
      call.method === 'POST' && call.path === '/api/matchings/45/messages'
        ? answer.promise
        : undefined
    const input = await openRoom()

    type(input, '네')
    fireEvent.click(sendButton())
    type(input, '네네')
    type(input, '네')

    await act(async () => {
      answer.release(ok(message(9, 'USER', '네', ME)))
    })
    await within(log()).findByText('네')
    expect(input).toHaveValue('네')
  })

  it('sends a message once for a double submit', async () => {
    const answer = held()
    extra = (call) =>
      call.method === 'POST' && call.path === '/api/matchings/45/messages'
        ? answer.promise
        : undefined
    const input = await openRoom()

    type(input, '한 번만')
    const form = input.closest('form') as HTMLFormElement
    fireEvent.submit(form)
    fireEvent.submit(form)
    fireEvent.click(sendButton())
    await act(async () => {})
    expect(callsTo('POST', '/api/matchings/45/messages')).toHaveLength(1)

    await act(async () => {
      answer.release(ok(message(9, 'USER', '한 번만', ME)))
    })
    expect(await within(log()).findAllByText('한 번만')).toHaveLength(1)
    expect(callsTo('POST', '/api/matchings/45/messages')).toHaveLength(1)
  })

  it('gives the failed message back when nothing new was typed', async () => {
    extra = (call) =>
      call.method === 'POST' && call.path === '/api/matchings/45/messages'
        ? fail(500, 'INTERNAL_SERVER_ERROR', '서버 오류입니다.')
        : undefined
    const input = await openRoom()

    type(input, '보내기 실패')
    fireEvent.click(sendButton())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '서버 오류입니다.',
    )
    expect(input).toHaveValue('보내기 실패')
    expect(within(log()).queryByText('보내기 실패')).toBeNull()
  })

  it('keeps both the failed message and the new draft when the send fails', async () => {
    const answer = held()
    extra = (call) =>
      call.method === 'POST' && call.path === '/api/matchings/45/messages'
        ? answer.promise
        : undefined
    const input = await openRoom()

    type(input, '첫 메시지')
    fireEvent.click(sendButton())
    type(input, '새로 쓰는 중')
    await act(async () => {
      answer.release(fail(500, 'INTERNAL_SERVER_ERROR', '서버 오류입니다.'))
    })

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(input).toHaveValue('첫 메시지 새로 쓰는 중')
  })
})

describe('QA 4: the given-back text stays within the message limit', () => {
  it('sends nothing over 500 characters and lets the user shorten it', async () => {
    let fails = true
    const answer = held()
    extra = (call) => {
      if (call.method !== 'POST' || call.path !== '/api/matchings/45/messages')
        return undefined
      if (fails) return answer.promise
      return ok(
        message(9, 'USER', (call.body as { content: string }).content, ME),
      )
    }
    const input = await openRoom()

    const first = '가'.repeat(300)
    const typed = '나'.repeat(300)
    type(input, first)
    fireEvent.click(sendButton())
    type(input, typed)
    await act(async () => {
      answer.release(fail(500, 'INTERNAL_SERVER_ERROR', '서버 오류입니다.'))
    })
    await screen.findByRole('alert')
    expect(input).toHaveValue(`${first} ${typed}`)

    // 601 characters: the field keeps them, and nothing is sent.
    fails = false
    fireEvent.click(sendButton())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '메시지는 500자까지 보낼 수 있어요.',
    )
    expect(callsTo('POST', '/api/matchings/45/messages')).toHaveLength(1)
    expect(input).toHaveValue(`${first} ${typed}`)

    // Shortened to the failed message, it goes out once.
    type(input, first)
    fireEvent.click(sendButton())
    expect(await within(log()).findByText(first)).toBeInTheDocument()
    expect(callsTo('POST', '/api/matchings/45/messages')).toHaveLength(2)
    expect(
      (
        callsTo('POST', '/api/matchings/45/messages')[1].body as {
          content: string
        }
      ).content,
    ).toBe(first)
  })
})

describe('QA 5: the final match dialog follows the room', () => {
  it('closes the dialog and sends nothing when the partner ends the room', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await openRoom()

    fireEvent.click(screen.getByRole('button', { name: '매칭확정 하기' }))
    expect(dialog('매칭을 확정하시겠습니까?')).toBeInTheDocument()

    roomState = { ...baseRoom(), status: 'ENDED', end_reason: 'USER_ENDED' }
    nextPoll = [message(30, 'SYSTEM', '민트초코님이 채팅을 종료했어요.')]
    await act(() => vi.advanceTimersByTimeAsync(2500))

    expect(await screen.findByText('매칭이 중지되었어요')).toBeInTheDocument()
    expect(dialog('매칭을 확정하시겠습니까?')).toBeNull()
    expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeDisabled()
    expect(callsTo('PATCH', '/api/matchings/45/confirm')).toHaveLength(0)
  })

  it('closes the dialog when the partner matched with someone else', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await openRoom()

    fireEvent.click(screen.getByRole('button', { name: '매칭확정 하기' }))
    roomState = {
      ...baseRoom(),
      status: 'ENDED',
      end_reason: 'PARTNER_MATCHED',
    }
    // No SYSTEM message: the room is read again every few polls.
    await act(() => vi.advanceTimersByTimeAsync(10_000))

    expect(
      await screen.findByText('상대가 다른 분과 매칭이 완료되었어요'),
    ).toBeInTheDocument()
    expect(dialog('매칭을 확정하시겠습니까?')).toBeNull()
    expect(callsTo('PATCH', '/api/matchings/45/confirm')).toHaveLength(0)
  })

  it('closes the agenda dialog as well when the room ends', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await openRoom()

    fireEvent.click(screen.getByRole('button', { name: '다음안건으로' }))
    expect(dialog('다음 안건으로 넘어가시겠습니까?')).toBeInTheDocument()
    roomState = { ...baseRoom(), status: 'ENDED', end_reason: 'USER_ENDED' }
    nextPoll = [message(30, 'SYSTEM', '민트초코님이 채팅을 종료했어요.')]
    await act(() => vi.advanceTimersByTimeAsync(2500))

    await screen.findByText('매칭이 중지되었어요')
    expect(dialog('다음 안건으로 넘어가시겠습니까?')).toBeNull()
    expect(
      callsTo('PATCH', '/api/matchings/45/agendas/101/decide'),
    ).toHaveLength(0)
  })

  it('sends nothing for a tap that lands after a poll ended the room but before the redraw', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await openRoom()
    fireEvent.click(screen.getByRole('button', { name: '매칭확정 하기' }))
    const confirmButton = screen.getByRole('button', { name: '확정하기' })

    roomState = { ...baseRoom(), status: 'ENDED', end_reason: 'USER_ENDED' }
    nextPoll = [message(30, 'SYSTEM', '민트초코님이 채팅을 종료했어요.')]
    // The poll and the tap fall in one batch: the dialog is still drawn when it is tapped.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
      confirmButton.click()
    })

    await screen.findByText('매칭이 중지되었어요')
    expect(callsTo('PATCH', '/api/matchings/45/confirm')).toHaveLength(0)
  })

  it('shows the ended room when it ended just as 확정하기 was pressed', async () => {
    extra = (call) => {
      if (call.path !== '/api/matchings/45/confirm') return undefined
      // The partner ended it on the server a moment earlier.
      roomState = { ...baseRoom(), status: 'ENDED', end_reason: 'USER_ENDED' }
      return fail(409, 'INVALID_MATCHING_STATUS', '진행 중인 매칭이 아닙니다.')
    }
    await openRoom()

    fireEvent.click(screen.getByRole('button', { name: '매칭확정 하기' }))
    fireEvent.click(screen.getByRole('button', { name: '확정하기' }))

    expect(await screen.findByText('매칭이 중지되었어요')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      '진행 중인 매칭이 아닙니다.',
    )
    expect(screen.queryByRole('button', { name: '매칭확정 하기' })).toBeNull()
    expect(callsTo('PATCH', '/api/matchings/45/confirm')).toHaveLength(1)
  })

  it('still completes the match when both confirm', async () => {
    roomState = { ...baseRoom(), partner_confirmed: true }
    extra = (call) => {
      if (call.path !== '/api/matchings/45/confirm') return undefined
      roomState = {
        ...baseRoom(),
        status: 'CONFIRMED',
        my_confirmed: true,
        partner_confirmed: true,
      }
      return ok({
        matching_id: 45,
        status: 'CONFIRMED',
        my_confirmed: true,
        partner_confirmed: true,
      })
    }
    await openRoom()

    fireEvent.click(screen.getByRole('button', { name: '매칭확정 하기' }))
    fireEvent.click(screen.getByRole('button', { name: '확정하기' }))

    expect(
      await screen.findByText('🎉 매칭이 확정되었습니다'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(callsTo('PATCH', '/api/matchings/45/confirm')).toHaveLength(1)
  })
})
