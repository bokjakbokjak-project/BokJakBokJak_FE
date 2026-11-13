import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { clearTokens, startSession } from '../../lib/auth/tokenStore'
import { MISSION_NOTICE_MS } from '../../components/onboarding/MissionNotice'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { QUESTION_ROUTES } from '../question/questionData'

/**
 * The onboarding in server mode against a stand-in backend: dormitory search and registration,
 * then PUT /api/me/onboarding from the priority step. Bodies follow the Notion spec.
 */

const BASE = 'https://api.example.test'
const STORAGE_KEY = 'bokjak-auth-refresh'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
const ok = (data: unknown) =>
  json(200, { success: true, code: 'OK', message: '성공', data })
const fail = (
  status: number,
  code: string,
  message: string,
  errors: Record<string, string> = {},
) => json(status, { success: false, code, message, errors })

const tokens = (n: number) => ({
  access_token: `access-${n}`,
  token_type: 'Bearer',
  expires_in: 1800,
  refresh_token: `refresh-${n}`,
  refresh_expires_in: 1209600,
})

const SAEBOM = {
  dormitory_key: '새봄학사',
  name: '새봄학사',
  room_types: [{ room_type_id: 101, name: '2인실', capacity: 2 }],
}
const SAVED = {
  onboarding_completed: true,
  survey_completed: false,
  next_step: 'SURVEY',
}

type Call = { method: string; path: string; body: unknown; auth: string | null }
let calls: Call[]
let fetchMock: ReturnType<typeof vi.fn>
type Handler = (call: Call) => Response | Promise<Response>
let handlers: Record<string, Handler>
let refreshCount: number

const callsTo = (method: string, prefix: string) =>
  calls.filter((call) => call.method === method && call.path.startsWith(prefix))
const puts = () => callsTo('PUT', '/api/me/onboarding')
const posts = () => callsTo('POST', '/api/dormitories')
const searches = () => callsTo('GET', '/api/dormitories')
const keywordOf = (call: Call) =>
  new URL(`${BASE}${call.path}`).searchParams.get('keyword')

function LocationProbe() {
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="path">{useLocation().pathname}</output>
      <button
        type="button"
        onClick={() => navigate(ONBOARDING_ROUTES.complete)}
      >
        probe: open complete
      </button>
    </>
  )
}
const path = () => screen.getByTestId('path').textContent

const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('button', { name }))
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

beforeEach(() => {
  calls = []
  refreshCount = 0
  handlers = {
    'GET /api/dormitories': () => ok({ dormitories: [SAEBOM] }),
    'POST /api/dormitories': () => ok(SAEBOM),
    'PUT /api/me/onboarding': () => ok(SAVED),
  }
  fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    const call: Call = {
      method: init.method ?? 'GET',
      path: url.slice(BASE.length),
      body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
      auth: new Headers(init.headers).get('Authorization'),
    }
    calls.push(call)
    if (call.path === '/api/auth/refresh') {
      refreshCount += 1
      return ok(tokens(refreshCount))
    }
    const handler = handlers[`${call.method} ${call.path.split('?')[0]}`]
    if (!handler)
      throw new Error(`unexpected request ${call.method} ${call.path}`)
    return handler(call)
  })
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_MODE', 'server')
  vi.stubEnv('VITE_API_BASE_URL', BASE)
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client.apps.googleusercontent.com')
  clearTokens()
  // A stored session, restored by one refresh like a reload after sign-in.
  sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  clearTokens()
})

async function renderSchoolStep() {
  render(
    <MemoryRouter initialEntries={[ONBOARDING_ROUTES.school]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  )
  await screen.findByRole('heading', { name: '학교 정보를 등록해주세요' })
}

async function fillUpToDormitory() {
  await renderSchoolStep()
  type('학과', '소프트웨어학과')
  type('학번', '2024123456')
  click('다음으로')
  type('닉네임', '민수정')
  click('여성')
  click('출생년도를 선택해주세요')
  click('선택하기')
  click('다음으로')
  await screen.findByRole('heading', { name: '기숙사 정보를 등록해주세요' })
}

/** Searches and picks 새봄학사 from the list. The room type follows from 방 인원. */
async function pickExistingDormitory() {
  const dormitory = screen.getByRole('combobox', { name: '기숙사' })
  fireEvent.focus(dormitory)
  fireEvent.change(dormitory, { target: { value: '새봄' } })
  fireEvent.click(await screen.findByRole('option', { name: '새봄학사' }))
  expect(screen.getByLabelText('방 타입')).toHaveValue('2인실')
}

function typeNewDormitory(name = '하늘관') {
  type('기숙사', name)
}

const HANEUL = {
  dormitory_key: '하늘관',
  name: '하늘관',
  room_types: [{ room_type_id: 501, name: '2인실', capacity: 2 }],
}

async function goToPriorityAndChoose() {
  click('다음으로')
  await screen.findByRole('button', { name: '완료하기' })
  // The mission notice opens on the first visit; let it close by itself.
  vi.useFakeTimers()
  act(() => vi.advanceTimersByTime(MISSION_NOTICE_MS))
  vi.useRealTimers()
  click(/잠버릇/)
  click(/기상알람/)
  click(/청소,청결/)
}

const finish = () => click('완료하기')

describe('server onboarding: existing dormitory', () => {
  it('saves with the picked room_type_id, without registering, then opens the complete screen', async () => {
    await fillUpToDormitory()
    await pickExistingDormitory()
    await goToPriorityAndChoose()
    finish()

    await waitFor(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    expect(posts()).toHaveLength(0)
    expect(puts()).toHaveLength(1)
    expect(puts()[0].auth).toBe('Bearer access-1')
    expect(puts()[0].body).toEqual({
      department: '소프트웨어학과',
      student_number: '2024123456',
      nickname: '민수정',
      gender: 'FEMALE',
      birth_year: expect.any(Number),
      room_type_id: 101,
      priorities: [
        { category_code: 'SLEEP_HABITS', rank: 1 },
        { category_code: 'SLEEP_SCHEDULE', rank: 2 },
        { category_code: 'CLEANING', rank: 3 },
      ],
    })

    click('시작하기!')
    expect(path()).toBe(QUESTION_ROUTES.survey)
  })

  it('shows 2인실 in the 방 타입 field, which takes no input', async () => {
    await fillUpToDormitory()
    const roomType = screen.getByLabelText('방 타입')

    expect(roomType).toHaveValue('2인실')
    expect(roomType).toHaveAttribute('readonly')
    // 4인실 only shows the MVP notice, so the room type stays 2인실.
    click('4인실')
    expect(roomType).toHaveValue('2인실')
  })

  it('uses an exact typed match without opening the list or registering', async () => {
    await fillUpToDormitory()
    const dormitory = screen.getByRole('combobox', { name: '기숙사' })
    fireEvent.focus(dormitory)
    fireEvent.change(dormitory, { target: { value: '새봄학사' } })
    await waitFor(() => expect(searches()).toHaveLength(1))
    await goToPriorityAndChoose()
    finish()

    await waitFor(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    expect(posts()).toHaveLength(0)
    expect(puts()[0].body).toMatchObject({ room_type_id: 101 })
  })

  it('searches again before saving when the name was typed without a search', async () => {
    await fillUpToDormitory()
    typeNewDormitory('새봄학사')
    await goToPriorityAndChoose()
    finish()

    await waitFor(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    expect(keywordOf(searches().at(-1)!)).toBe('새봄학사')
    expect(posts()).toHaveLength(0)
    expect(puts()[0].body).toMatchObject({ room_type_id: 101 })
  })
})

describe('server onboarding: new dormitory or room type', () => {
  it('registers 2인실 once at submit, with capacity 2, and saves the returned ID', async () => {
    handlers['GET /api/dormitories'] = () => ok({ dormitories: [] })
    handlers['POST /api/dormitories'] = () => ok(HANEUL)
    await fillUpToDormitory()
    typeNewDormitory()
    // Typing alone never registers.
    expect(posts()).toHaveLength(0)
    await goToPriorityAndChoose()
    expect(posts()).toHaveLength(0)
    finish()

    await waitFor(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    expect(posts()).toHaveLength(1)
    expect(posts()[0].body).toEqual({
      name: '하늘관',
      room_type_name: '2인실',
      capacity: 2,
    })
    expect(puts()[0].body).toMatchObject({ room_type_id: 501 })
  })

  it('adds 2인실 to an existing dormitory without one, picking it from several returned room types', async () => {
    const withoutTwo = {
      ...SAEBOM,
      room_types: [{ room_type_id: 108, name: 'A동', capacity: 2 }],
    }
    handlers['GET /api/dormitories'] = () => ok({ dormitories: [withoutTwo] })
    handlers['POST /api/dormitories'] = () =>
      ok({
        ...SAEBOM,
        room_types: [
          { room_type_id: 108, name: 'A동', capacity: 2 },
          { room_type_id: 109, name: '2인실', capacity: 4 },
          { room_type_id: 102, name: '2인실', capacity: 2 },
        ],
      })
    await fillUpToDormitory()
    await pickExistingDormitory()
    await goToPriorityAndChoose()
    finish()

    await waitFor(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    expect(posts()[0].body).toEqual({
      name: '새봄학사',
      room_type_name: '2인실',
      capacity: 2,
    })
    expect(puts()[0].body).toMatchObject({ room_type_id: 102 })
  })

  it('saves nothing when the POST answer has no single 2인실 of capacity 2', async () => {
    handlers['GET /api/dormitories'] = () => ok({ dormitories: [] })
    handlers['POST /api/dormitories'] = () =>
      ok({
        ...HANEUL,
        room_types: [{ room_type_id: 777, name: 'A동', capacity: 2 }],
      })
    await fillUpToDormitory()
    typeNewDormitory()
    await goToPriorityAndChoose()
    finish()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '서버 응답을 확인할 수 없어요',
    )
    expect(puts()).toHaveLength(0)
  })

  it('keeps the answers after a failed save and reuses the registered ID on retry', async () => {
    handlers['GET /api/dormitories'] = () => ok({ dormitories: [] })
    handlers['POST /api/dormitories'] = () => ok(HANEUL)
    handlers['PUT /api/me/onboarding'] = () =>
      fail(500, 'INTERNAL_ERROR', '서버 오류')
    await fillUpToDormitory()
    typeNewDormitory()
    await goToPriorityAndChoose()
    finish()

    expect(await screen.findByRole('alert')).toHaveTextContent('서버 오류')
    expect(path()).toBe(ONBOARDING_ROUTES.priority)
    expect(screen.getByRole('button', { name: /잠버릇/ })).toHaveAccessibleName(
      /1순위/,
    )

    handlers['PUT /api/me/onboarding'] = () => ok(SAVED)
    finish()

    await waitFor(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    expect(posts()).toHaveLength(1)
    expect(puts()).toHaveLength(2)
    expect(puts()[1].body).toMatchObject({ room_type_id: 501 })
  })

  it('keeps the typed dormitory when registering fails', async () => {
    handlers['GET /api/dormitories'] = () => ok({ dormitories: [] })
    handlers['POST /api/dormitories'] = () =>
      fail(400, 'INVALID_INPUT', '요청 값이 올바르지 않습니다.', {
        name: '기숙사명을 입력해주세요.',
      })
    await fillUpToDormitory()
    typeNewDormitory()
    await goToPriorityAndChoose()
    finish()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '기숙사: 기숙사명을 입력해주세요.',
    )
    expect(puts()).toHaveLength(0)
    click('이전')
    expect(screen.getByLabelText('기숙사')).toHaveValue('하늘관')
    expect(screen.getByLabelText('방 타입')).toHaveValue('2인실')
  })
})

describe('server onboarding: submit safety', () => {
  it('sends one save for a double press and shows the pending state', async () => {
    let release: (response: Response) => void = () => {}
    handlers['PUT /api/me/onboarding'] = () =>
      new Promise<Response>((resolve) => {
        release = resolve
      })
    await fillUpToDormitory()
    await pickExistingDormitory()
    await goToPriorityAndChoose()
    const button = screen.getByRole('button', { name: '완료하기' })
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => expect(puts()).toHaveLength(1))
    expect(button).toHaveTextContent('저장 중')
    expect(button).toBeDisabled()
    // Answers being saved cannot change meanwhile.
    click(/개인청결/)
    expect(
      screen.getByRole('button', { name: /개인청결/ }),
    ).not.toHaveAccessibleName(/4순위/)

    await act(async () => release(ok(SAVED)))
    await waitFor(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    expect(puts()).toHaveLength(1)
  })

  it('starts no second save from a priority step reopened while one is out', async () => {
    let release: (response: Response) => void = () => {}
    handlers['PUT /api/me/onboarding'] = () =>
      new Promise<Response>((resolve) => {
        release = resolve
      })
    await fillUpToDormitory()
    await pickExistingDormitory()
    await goToPriorityAndChoose()
    finish()
    await waitFor(() => expect(puts()).toHaveLength(1))

    // Leave while the save is out, then come back.
    click('이전')
    await screen.findByRole('heading', { name: '기숙사 정보를 등록해주세요' })
    click('다음으로')
    const button = await screen.findByRole('button', { name: '저장 중...' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(puts()).toHaveLength(1)

    // The first save finishes after its screen closed: it still counts for the same answers.
    await act(async () => release(ok(SAVED)))
    const finishButton = await screen.findByRole('button', { name: '완료하기' })
    expect(path()).toBe(ONBOARDING_ROUTES.priority)
    fireEvent.click(finishButton)

    await waitFor(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    expect(puts()).toHaveLength(1)
  })

  it('sends nothing more for the previous account once another account signs in', async () => {
    let releaseSearch: (response: Response) => void = () => {}
    await fillUpToDormitory()
    typeNewDormitory()
    await goToPriorityAndChoose()
    handlers['GET /api/dormitories'] = () =>
      new Promise<Response>((resolve) => {
        releaseSearch = resolve
      })
    finish()
    await waitFor(() => expect(searches()).toHaveLength(1))
    expect(searches()[0].auth).toBe('Bearer access-1')

    // Account B signs in while A's lookup is out.
    act(() =>
      startSession({ accessToken: 'access-b', refreshToken: 'refresh-b' }),
    )
    await act(async () => releaseSearch(ok({ dormitories: [] })))

    expect(posts()).toHaveLength(0)
    expect(puts()).toHaveLength(0)
  })

  it('saves again when the answers changed after a save that finished off screen', async () => {
    let release: (response: Response) => void = () => {}
    handlers['PUT /api/me/onboarding'] = () =>
      new Promise<Response>((resolve) => {
        release = resolve
      })
    await fillUpToDormitory()
    await pickExistingDormitory()
    await goToPriorityAndChoose()
    finish()
    await waitFor(() => expect(puts()).toHaveLength(1))

    click('이전')
    await screen.findByRole('heading', { name: '기숙사 정보를 등록해주세요' })
    await act(async () => release(ok(SAVED)))
    click('다음으로')
    await screen.findByRole('button', { name: '완료하기' })
    click(/개인청결/)

    handlers['PUT /api/me/onboarding'] = () => ok(SAVED)
    finish()
    await waitFor(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    expect(puts()).toHaveLength(2)
    expect(puts()[1].body).toMatchObject({
      priorities: [
        { category_code: 'SLEEP_HABITS', rank: 1 },
        { category_code: 'SLEEP_SCHEDULE', rank: 2 },
        { category_code: 'CLEANING', rank: 3 },
        { category_code: 'PERSONAL_HYGIENE', rank: 4 },
      ],
    })
  })

  it('shows the server message when the survey was already submitted (409)', async () => {
    handlers['PUT /api/me/onboarding'] = () =>
      fail(
        409,
        'ONBOARDING_ALREADY_SUBMITTED',
        '순위 변경은 설문 수정에서 진행해주세요.',
      )
    await fillUpToDormitory()
    await pickExistingDormitory()
    await goToPriorityAndChoose()
    finish()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '순위 변경은 설문 수정에서 진행해주세요.',
    )
    expect(path()).toBe(ONBOARDING_ROUTES.priority)
  })

  it('names the answer of a field error (400)', async () => {
    handlers['PUT /api/me/onboarding'] = () =>
      fail(400, 'INVALID_INPUT', '요청 값이 올바르지 않습니다.', {
        student_number: '숫자 4~10자리로 입력해주세요.',
      })
    await fillUpToDormitory()
    await pickExistingDormitory()
    await goToPriorityAndChoose()
    finish()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '학번: 숫자 4~10자리로 입력해주세요.',
    )
  })

  it('looks the room type up again after the server refuses its ID (404)', async () => {
    handlers['PUT /api/me/onboarding'] = () =>
      fail(404, 'ROOM_TYPE_NOT_FOUND', '선택한 방 타입을 찾을 수 없습니다.')
    await fillUpToDormitory()
    await pickExistingDormitory()
    await goToPriorityAndChoose()
    const searchesBefore = searches().length
    finish()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '선택한 방 타입을 찾을 수 없습니다.',
    )
    handlers['PUT /api/me/onboarding'] = () => ok(SAVED)
    finish()

    await waitFor(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    expect(searches().length).toBe(searchesBefore + 1)
  })

  it('reports a network failure and keeps the answers', async () => {
    handlers['PUT /api/me/onboarding'] = () => {
      throw new TypeError('Failed to fetch')
    }
    await fillUpToDormitory()
    await pickExistingDormitory()
    await goToPriorityAndChoose()
    finish()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '네트워크 연결을 확인하고 다시 시도해주세요.',
    )
    expect(screen.getByRole('button', { name: '완료하기' })).toBeEnabled()
  })

  it('refreshes an expired access token and retries the save once', async () => {
    let attempts = 0
    handlers['PUT /api/me/onboarding'] = () => {
      attempts += 1
      return attempts === 1
        ? fail(
            401,
            'UNAUTHORIZED',
            '로그인이 필요하거나 인증이 만료되었습니다.',
          )
        : ok(SAVED)
    }
    await fillUpToDormitory()
    await pickExistingDormitory()
    await goToPriorityAndChoose()
    finish()

    await waitFor(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    expect(puts().map((call) => call.auth)).toEqual([
      'Bearer access-1',
      'Bearer access-2',
    ])
  })

  it('does not open the complete screen by address before the answers are saved', async () => {
    await fillUpToDormitory()
    await pickExistingDormitory()
    await goToPriorityAndChoose()

    click('probe: open complete')

    expect(path()).toBe(ONBOARDING_ROUTES.priority)
    expect(puts()).toHaveLength(0)
  })

  it('asks to save again after a saved answer changes', async () => {
    await fillUpToDormitory()
    await pickExistingDormitory()
    await goToPriorityAndChoose()
    finish()
    await waitFor(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))

    click('이전')
    click(/청소,청결/)
    click(/개인청결/)
    click('probe: open complete')
    expect(path()).toBe(ONBOARDING_ROUTES.priority)

    finish()
    await waitFor(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    expect(puts()).toHaveLength(2)
  })
})
