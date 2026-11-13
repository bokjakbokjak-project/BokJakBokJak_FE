import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../app/AppRoutes'
import { clearTokens, startSession } from '../lib/auth/tokenStore'
import { MY_ROUTES } from '../lib/my/routes'
import { markMyProfileStale } from '../lib/profile/myProfile'
import { ROOMMATE_ROUTES } from '../lib/roommate/routes'
import {
  FIRST_OPTION_ANSWERS,
  mySurveyData,
  profileData,
  schemaData,
} from '../test/surveyFixture'
import { QUESTION_ROUTES } from './question/questionData'

/**
 * The profile APIs in server mode against a stand-in backend (세호 spec): GET and PATCH
 * /api/me/profile, GET /api/roommates/{id}/profile. Bodies are snake_case as in the spec.
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
const fail = (
  status: number,
  code: string,
  message: string,
  errors: Record<string, string> = {},
) => json(status, { success: false, code, message, errors })

type Call = { method: string; path: string; body: unknown }
let calls: Call[]
type Handler = (call: Call) => Response | Promise<Response>
let handlers: Record<string, Handler>

const callsTo = (method: string, path: string) =>
  calls.filter((call) => call.method === method && call.path === path)

/** The candidate's answers differ from mine, so a mix-up shows. */
const CANDIDATE_ANSWERS = FIRST_OPTION_ANSWERS.map((answer) =>
  answer.question_code === 'SMOKING_T'
    ? { ...answer, option_code: 'NON_SMOKER_ONLY' }
    : answer.question_code === 'SLEEP_HABITS_H'
      ? { ...answer, option_code: 'NONE' }
      : answer,
)

function LocationProbe() {
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="path">{useLocation().pathname}</output>
      <button type="button" onClick={() => navigate(MY_ROUTES.my)}>
        probe: open my page
      </button>
      <button
        type="button"
        onClick={() => navigate(ROOMMATE_ROUTES.profile('88'))}
      >
        probe: open candidate 88
      </button>
      <button
        type="button"
        onClick={() => navigate(ROOMMATE_ROUTES.profile('77'))}
      >
        probe: open candidate 77
      </button>
    </>
  )
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

beforeEach(() => {
  calls = []
  handlers = {
    'GET /api/me/profile': () => ok(profileData()),
    'GET /api/surveys/current': () => ok(schemaData()),
    'GET /api/me/survey': () =>
      ok(
        mySurveyData({
          revision: 1,
          completed: true,
          priorities: [
            { category_code: 'SMOKING', rank: 1 },
            { category_code: 'CLEANING', rank: 2 },
            { category_code: 'SLEEP_HABITS', rank: 3 },
          ],
          answers: FIRST_OPTION_ANSWERS,
        }),
      ),
    'PATCH /api/me/profile': (call) =>
      ok({ nickname: (call.body as { nickname: string }).nickname }),
    'GET /api/recommendations': () =>
      ok({ recommendations: [], total_count: 0 }),
    'GET /api/notifications/unread-count': () => ok({ unread_count: 0 }),
  }
  vi.stubEnv('VITE_API_MODE', 'server')
  vi.stubEnv('VITE_API_BASE_URL', BASE)
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
      const handler = handlers[`${call.method} ${call.path}`]
      return handler ? handler(call) : fail(404, 'NOT_FOUND', 'not found')
    }),
  )
  clearTokens()
  startSession({ accessToken: 'access-1', refreshToken: 'refresh-1' })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  clearTokens()
})

const head = (container: HTMLElement) =>
  container.querySelector('[data-layer="head"]')?.getAttribute('data-variant')

describe('my profile', () => {
  it('shows the saved nickname and the top category character on the my page', async () => {
    renderAt(MY_ROUTES.my)

    expect(
      await screen.findByRole('heading', { name: '서버닉네임' }),
    ).toBeInTheDocument()
    expect(head(screen.getByTestId('profile-avatar'))).toBe('smoking')
    expect(screen.queryByText('사용자')).not.toBeInTheDocument()
  })

  it('greets the user by the saved nickname on the home', async () => {
    renderAt('/home')

    expect(
      await screen.findByRole('heading', { name: /안녕하세요 서버닉네임님/ }),
    ).toBeInTheDocument()
  })

  it('shows the server name, age, department and answers on the detail profile', async () => {
    renderAt(QUESTION_ROUTES.profile)

    expect(
      await screen.findByRole('heading', { name: '서버닉네임님' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/21세/)).toBeInTheDocument()
    expect(screen.getByText(/서버학과/)).toBeInTheDocument()
    expect(screen.queryByText('사용자님')).not.toBeInTheDocument()
    const cards = screen.getAllByRole('region')
    expect(cards.length).toBeGreaterThanOrEqual(5)
    expect(
      screen.getAllByText('자주 있다는 말을 들었다').length,
    ).toBeGreaterThan(0)
  })

  it('reads the profile once for the screens of a session', async () => {
    renderAt(MY_ROUTES.my)
    await screen.findByRole('heading', { name: '서버닉네임' })
    fireEvent.click(screen.getByRole('link', { name: '상세 프로필 보기' }))
    await screen.findByRole('heading', { name: '서버닉네임님' })

    expect(callsTo('GET', '/api/me/profile')).toHaveLength(1)
  })

  it('sends the user to the survey from the detail profile before the first survey (409)', async () => {
    handlers['GET /api/me/profile'] = () =>
      fail(409, 'SURVEY_REQUIRED', '설문을 먼저 완료해주세요.')
    handlers['GET /api/me/survey'] = () => ok(mySurveyData())
    renderAt(QUESTION_ROUTES.profile)

    await screen.findByText('설문을 불러오고 있어요').catch(() => undefined)
    await vi.waitFor(() => expect(path()).toBe(QUESTION_ROUTES.survey))
  })

  it('keeps the my page usable before the first survey and asks only once', async () => {
    handlers['GET /api/me/profile'] = () =>
      fail(409, 'SURVEY_REQUIRED', '설문을 먼저 완료해주세요.')
    renderAt(MY_ROUTES.my)

    expect(await screen.findByRole('heading', { name: '사용자' })).toBeVisible()
    expect(
      screen.getByRole('button', { name: '설문조사 다시 하기' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: '닉네임 수정' }))
    fireEvent.click(screen.getByRole('button', { name: '뒤로' }))
    await screen.findByRole('heading', { name: '사용자' })

    expect(callsTo('GET', '/api/me/profile')).toHaveLength(1)
  })

  it('shows a retry when the profile cannot be read', async () => {
    let failing = true
    handlers['GET /api/me/profile'] = () =>
      failing
        ? fail(500, 'INTERNAL_ERROR', '서버에 문제가 생겼어요.')
        : ok(profileData())
    renderAt(QUESTION_ROUTES.profile)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '서버에 문제가 생겼어요.',
    )
    failing = false
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(
      await screen.findByRole('heading', { name: '서버닉네임님' }),
    ).toBeInTheDocument()
  })
})

describe('nickname', () => {
  async function openEdit() {
    renderAt(MY_ROUTES.my)
    await screen.findByRole('heading', { name: '서버닉네임' })
    fireEvent.click(screen.getByRole('link', { name: '닉네임 수정' }))
    const input = screen.getByLabelText('닉네임')
    expect(input).toHaveValue('서버닉네임')
    return input
  }

  it('saves the trimmed nickname once, only on 저장, and shows it everywhere', async () => {
    const input = await openEdit()
    fireEvent.change(input, { target: { value: '  복작이  ' } })
    expect(callsTo('PATCH', '/api/me/profile')).toHaveLength(0)

    const save = screen.getByRole('button', { name: '저장' })
    fireEvent.click(save)
    fireEvent.click(save)

    expect(
      await screen.findByRole('heading', { name: '복작이' }),
    ).toBeInTheDocument()
    expect(path()).toBe(MY_ROUTES.my)
    expect(callsTo('PATCH', '/api/me/profile')).toEqual([
      {
        method: 'PATCH',
        path: '/api/me/profile',
        body: { nickname: '복작이' },
      },
    ])
    // The detail profile shows the new nickname without reading the profile again.
    fireEvent.click(screen.getByRole('link', { name: '상세 프로필 보기' }))
    expect(
      await screen.findByRole('heading', { name: '복작이님' }),
    ).toBeInTheDocument()
    expect(callsTo('GET', '/api/me/profile')).toHaveLength(1)
    // A nickname save never touches the survey.
    expect(callsTo('PUT', '/api/me/survey')).toHaveLength(0)
  })

  it('keeps the typed nickname and the saved one when the server refuses it', async () => {
    handlers['PATCH /api/me/profile'] = () =>
      fail(400, 'INVALID_NICKNAME', '닉네임은 1~20자로 입력해주세요.', {
        nickname: 'INVALID_FORMAT',
      })
    const input = await openEdit()
    fireEvent.change(input, { target: { value: '새이름' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '닉네임은 1~20자로 입력해주세요.',
    )
    expect(input).toHaveValue('새이름')
    expect(path()).toBe(MY_ROUTES.editName)

    fireEvent.click(screen.getByRole('button', { name: '뒤로' }))
    expect(
      await screen.findByRole('heading', { name: '서버닉네임' }),
    ).toBeInTheDocument()
  })

  it('says a nickname is too long and sends nothing; a blank one cannot be saved', async () => {
    const input = await openEdit()
    fireEvent.change(input, { target: { value: '가'.repeat(21) } })

    expect(screen.getByRole('alert')).toHaveTextContent(
      '닉네임은 1~20자로 입력해주세요.',
    )
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()

    fireEvent.change(input, { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
    fireEvent.submit(input.closest('form')!)
    expect(callsTo('PATCH', '/api/me/profile')).toHaveLength(0)
  })

  it('shows a network failure and keeps the typed nickname', async () => {
    handlers['PATCH /api/me/profile'] = () => {
      throw new TypeError('Failed to fetch')
    }
    const input = await openEdit()
    fireEvent.change(input, { target: { value: '새이름' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '네트워크 연결을 확인하고 다시 시도해주세요.',
    )
    expect(input).toHaveValue('새이름')
  })

  it('drops the reply of a save made for the previous account', async () => {
    let release: (response: Response) => void = () => {}
    handlers['PATCH /api/me/profile'] = () =>
      new Promise<Response>((resolve) => {
        release = resolve
      })
    const input = await openEdit()
    fireEvent.change(input, { target: { value: '이전계정' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await vi.waitFor(() =>
      expect(callsTo('PATCH', '/api/me/profile')).toHaveLength(1),
    )

    act(() =>
      startSession({ accessToken: 'access-b', refreshToken: 'refresh-b' }),
    )
    await act(async () => release(ok({ nickname: '이전계정' })))

    // Not applied: the screen stays, and the next profile read is the new account's.
    expect(path()).toBe(MY_ROUTES.editName)
    handlers['GET /api/me/profile'] = () =>
      ok(profileData({ nickname: '새계정' }))
    fireEvent.click(screen.getByRole('button', { name: 'probe: open my page' }))
    expect(
      await screen.findByRole('heading', { name: '새계정' }),
    ).toBeInTheDocument()
  })
})

describe('roommate detail profile', () => {
  beforeEach(() => {
    handlers['GET /api/recommendations'] = () =>
      ok({
        recommendations: [
          {
            user_id: 77,
            nickname: '후보칠칠',
            department: '컴퓨터공학과',
            age: 22,
            top_categories: ['CLEANING', 'SMOKING', 'SLEEP_HABITS'],
            match_score: 87,
            relation: 'NONE',
          },
        ],
        total_count: 1,
      })
    handlers['GET /api/roommates/77/profile'] = () =>
      ok(
        profileData({
          candidateId: 77,
          nickname: '후보칠칠',
          age: 22,
          department: '컴퓨터공학과',
          topCategories: ['CLEANING', 'SMOKING', 'SLEEP_HABITS'],
          answers: CANDIDATE_ANSWERS,
        }),
      )
    handlers['GET /api/users/77/lifestyle-summary'] = () =>
      ok({ summary: '깔끔한 편이에요.', keywords: [] })
  })

  it('shows the candidate’s own answers, never mine', async () => {
    renderAt(ROOMMATE_ROUTES.profile('77'))

    expect(
      await screen.findByRole('heading', { name: '후보칠칠님' }),
    ).toBeInTheDocument()
    const sheet = screen.getByRole('region', { name: '상세 답변 요약' })
    // 나의 성향 on this screen is the candidate's habit answer.
    expect(
      await within(sheet).findByText('없다는 말을 들었다'),
    ).toBeInTheDocument()
    expect(
      within(sheet).queryByText('자주 있다는 말을 들었다'),
    ).not.toBeInTheDocument()
    expect(callsTo('GET', '/api/me/profile')).toHaveLength(0)
  })

  it('takes the match rate from the recommendation list, not the profile', async () => {
    // The list loads the recommendations, which carry the match rate; then the detail opens.
    renderAt(ROOMMATE_ROUTES.list)
    await screen.findByRole('link', { name: /후보칠칠/ })
    fireEvent.click(
      screen.getByRole('button', { name: 'probe: open candidate 77' }),
    )

    expect(
      await screen.findByRole('heading', { name: '후보칠칠님' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/87/).length).toBeGreaterThan(0)
    expect(callsTo('GET', '/api/roommates/77/profile')).toHaveLength(1)
  })

  it('keeps the card and the summary when the answers are not in the agreed shape', async () => {
    handlers['GET /api/roommates/77/profile'] = () =>
      ok({
        ...profileData({ candidateId: 77, nickname: '후보칠칠' }),
        categories: [
          {
            category_code: 'SLEEP_HABITS',
            name: '잠버릇',
            topics: [{ topic_code: 'SLEEP_HABITS', questions: [] }],
          },
        ],
      })
    renderAt(ROOMMATE_ROUTES.profile('77'))

    expect(
      await screen.findByRole('heading', { name: '후보칠칠님' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('깔끔한 편이에요.')).toBeInTheDocument()
    expect(screen.queryByText('나의 성향')).not.toBeInTheDocument()
  })

  it('never shows an earlier candidate’s answer after moving to another', async () => {
    let releaseFirst: (response: Response) => void = () => {}
    handlers['GET /api/roommates/77/profile'] = () =>
      new Promise<Response>((resolve) => {
        releaseFirst = resolve
      })
    handlers['GET /api/roommates/88/profile'] = () =>
      ok(
        profileData({
          candidateId: 88,
          nickname: '후보팔팔',
          answers: FIRST_OPTION_ANSWERS,
        }),
      )
    handlers['GET /api/users/88/lifestyle-summary'] = () =>
      ok({ summary: '조용한 편이에요.', keywords: [] })
    renderAt(ROOMMATE_ROUTES.profile('77'))
    await vi.waitFor(() =>
      expect(callsTo('GET', '/api/roommates/77/profile')).toHaveLength(1),
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'probe: open candidate 88' }),
    )
    expect(
      await screen.findByRole('heading', { name: '후보팔팔님' }),
    ).toBeInTheDocument()
    await act(async () =>
      releaseFirst(
        ok(
          profileData({
            candidateId: 77,
            nickname: '후보칠칠',
            answers: CANDIDATE_ANSWERS,
          }),
        ),
      ),
    )

    expect(screen.queryByText('후보칠칠님')).not.toBeInTheDocument()
    expect(screen.queryByText('없다는 말을 들었다')).not.toBeInTheDocument()
  })

  it.each([
    [400, 'INVALID_INPUT', '요청 값이 올바르지 않습니다.'],
    [404, 'ROOMMATE_NOT_FOUND', '상대 프로필을 찾을 수 없습니다.'],
  ])('shows the server message for %i %s', async (status, code, message) => {
    handlers['GET /api/roommates/77/profile'] = () =>
      fail(status, code, message)
    renderAt(ROOMMATE_ROUTES.profile('77'))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByText('나의 성향')).not.toBeInTheDocument()
  })
})

describe('profile reads racing with saves', () => {
  it('keeps a nickname saved while the profile was still being read', async () => {
    let serverNickname = '서버닉네임'
    let releaseFirst: (response: Response) => void = () => {}
    let reads = 0
    handlers['GET /api/me/profile'] = () => {
      reads += 1
      if (reads === 1) {
        return new Promise<Response>((resolve) => {
          releaseFirst = resolve
        })
      }
      return ok(profileData({ nickname: serverNickname }))
    }
    handlers['PATCH /api/me/profile'] = (call) => {
      serverNickname = (call.body as { nickname: string }).nickname
      return ok({ nickname: serverNickname })
    }
    renderAt(MY_ROUTES.editName)
    await vi.waitFor(() => expect(reads).toBe(1))

    // Typed and saved before the first read answers.
    fireEvent.change(screen.getByLabelText('닉네임'), {
      target: { value: '먼저저장' },
    })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await vi.waitFor(() =>
      expect(callsTo('PATCH', '/api/me/profile')).toHaveLength(1),
    )
    // The first read answers late, with the nickname from before the save.
    await act(async () => releaseFirst(ok(profileData())))

    expect(
      await screen.findByRole('heading', { name: '먼저저장' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('서버닉네임')).not.toBeInTheDocument()
    expect(reads).toBe(2)
  })

  it('reads again when the survey was saved while the profile was being read', async () => {
    let releaseFirst: (response: Response) => void = () => {}
    let reads = 0
    handlers['GET /api/me/profile'] = () => {
      reads += 1
      if (reads === 1) {
        return new Promise<Response>((resolve) => {
          releaseFirst = resolve
        })
      }
      return ok(profileData({ nickname: '새설문', surveyRevision: 2 }))
    }
    renderAt(MY_ROUTES.my)
    await vi.waitFor(() => expect(reads).toBe(1))

    act(() => markMyProfileStale())
    await act(async () =>
      releaseFirst(ok(profileData({ nickname: '옛설문', surveyRevision: 1 }))),
    )

    expect(
      await screen.findByRole('heading', { name: '새설문' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('옛설문')).not.toBeInTheDocument()
    expect(reads).toBe(2)
  })
})
