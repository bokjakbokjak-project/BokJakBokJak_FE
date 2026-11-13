import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { MISSION_NOTICE_MS } from '../../components/onboarding/MissionNotice'
import { clearTokens, startSession } from '../../lib/auth/tokenStore'
import { MY_ROUTES } from '../../lib/my/routes'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { finishSituation } from '../../test/questionFade'
import {
  FIRST_OPTION_ANSWERS,
  FIVE_BEDTIME_H_OPTIONS,
  SPEC_BEDTIME_H_OPTIONS,
  mySurveyData,
  profileData,
  schemaData,
} from '../../test/surveyFixture'
import {
  QUESTION_COUNT,
  QUESTION_ROUTES,
  getQuestionStep,
} from './questionData'

/**
 * The survey in server mode against a stand-in backend: GET /api/surveys/current, GET and PUT
 * /api/me/survey. Bodies follow the Notion spec. The survey fixture is the live server survey of
 * 2026-11-14 (BEDTIME_H with the five Figma options) unless a test says otherwise.
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
const fail = (status: number, code: string, message: string) =>
  json(status, { success: false, code, message, errors: {} })

const tokens = (n: number) => ({
  access_token: `access-${n}`,
  token_type: 'Bearer',
  expires_in: 1800,
  refresh_token: `refresh-${n}`,
  refresh_expires_in: 1209600,
})

const SAVED_PRIORITIES = [
  { category_code: 'SMOKING', rank: 1 },
  { category_code: 'CLEANING', rank: 2 },
  { category_code: 'SLEEP_HABITS', rank: 3 },
]
const SAVED = {
  revision: 1,
  survey_completed: true,
  submitted_at: '2026-11-14T05:00:00Z',
  next_step: 'HOME',
}

type Call = { method: string; path: string; body: unknown; auth: string | null }
let calls: Call[]
type Handler = (call: Call) => Response | Promise<Response>
let handlers: Record<string, Handler>
let savedOnServer: {
  answers: { question_code: string; option_code: string }[]
  priorities: { category_code: string; rank: number }[]
} | null

const callsTo = (method: string, path: string) =>
  calls.filter((call) => call.method === method && call.path === path)
const puts = () => callsTo('PUT', '/api/me/survey')

function LocationProbe() {
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="path">{useLocation().pathname}</output>
      <button type="button" onClick={() => navigate(QUESTION_ROUTES.profile)}>
        probe: open result
      </button>
    </>
  )
}
const path = () => screen.getByTestId('path').textContent

beforeEach(() => {
  calls = []
  let refreshCount = 0
  handlers = {
    'GET /api/surveys/current': () =>
      ok(schemaData({ bedtime: FIVE_BEDTIME_H_OPTIONS })),
    'GET /api/me/survey': () =>
      ok(mySurveyData({ priorities: SAVED_PRIORITIES })),
    'PUT /api/me/survey': () => ok(SAVED),
    // The profile reflects what the server holds: the last successful save, or else the saved
    // survey; before the first survey it is 409, as the spec says.
    'GET /api/me/profile': async () => {
      if (!savedOnServer) {
        const mine = await (
          await handlers['GET /api/me/survey']({
            method: 'GET',
            path: '/api/me/survey',
            body: undefined,
            auth: null,
          })
        ).json()
        if (!mine.data?.survey_completed) {
          return fail(409, 'SURVEY_REQUIRED', '설문을 먼저 완료해주세요.')
        }
        savedOnServer = {
          answers: mine.data.answers,
          priorities: mine.data.priorities,
        }
      }
      return ok(
        profileData({
          answers: savedOnServer.answers,
          topCategories: [...savedOnServer.priorities]
            .sort((a, b) => a.rank - b.rank)
            .slice(0, 3)
            .map((p) => p.category_code),
        }),
      )
    },
  }
  savedOnServer = null
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const call: Call = {
        method: init.method ?? 'GET',
        path: url.slice(BASE.length),
        body:
          init.body === undefined ? undefined : JSON.parse(String(init.body)),
        auth: new Headers(init.headers).get('Authorization'),
      }
      calls.push(call)
      if (call.path === '/api/auth/refresh') {
        refreshCount += 1
        return ok(tokens(refreshCount))
      }
      const handler = handlers[`${call.method} ${call.path}`]
      const response = handler
        ? await handler(call)
        : fail(404, 'NOT_FOUND', 'not found')
      // The server's saved survey changes only with a successful save.
      if (
        call.path === '/api/me/survey' &&
        call.method === 'PUT' &&
        response.ok
      ) {
        const body = call.body as {
          answers: { question_code: string; option_code: string }[]
          priorities: { category_code: string; rank: number }[]
        }
        savedOnServer = { answers: body.answers, priorities: body.priorities }
      }
      return response
    }),
  )
  vi.stubEnv('VITE_API_MODE', 'server')
  vi.stubEnv('VITE_API_BASE_URL', BASE)
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client.apps.googleusercontent.com')
  clearTokens()
  sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  clearTokens()
})

/**
 * Runs `check` until it passes, advancing the fake clock and letting requests settle in
 * between. The test library's own waiting does not run under fake timers.
 */
async function until<T>(check: () => T): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return check()
    } catch (error) {
      if (attempt >= 60) throw error
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20)
      })
    }
  }
}

function renderAt(route: string) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  )
}

const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('button', { name }))

const pickFirst = (index: number) =>
  fireEvent.click(
    screen.getByRole('radio', {
      name: getQuestionStep(index).question.options[0],
    }),
  )

/** Answers every question with its first option, then waits out the loading screen. */
async function answerAllAndFinish(choose: (index: number) => void = pickFirst) {
  for (let index = 0; index < QUESTION_COUNT; index += 1) {
    if (index % 2 === 0 && screen.queryByLabelText(/^STEP \d+ 상황$/)) {
      finishSituation()
    }
    choose(index)
    click('다음으로')
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000)
  })
}

async function openSurvey() {
  renderAt(QUESTION_ROUTES.survey)
  await until(() => screen.getByLabelText('STEP 1 상황'))
}

describe('server survey: first submit', () => {
  it('reads the survey and the saved state before the first question', async () => {
    renderAt(QUESTION_ROUTES.survey)

    await until(() => screen.getByLabelText('STEP 1 상황'))
    expect(callsTo('GET', '/api/surveys/current')).toHaveLength(1)
    expect(callsTo('GET', '/api/me/survey')).toHaveLength(1)
    expect(callsTo('GET', '/api/me/survey')[0].auth).toBe('Bearer access-1')
  })

  it('sends all 16 answers by code with revision 0 and the saved priorities, then opens the result', async () => {
    await openSurvey()
    await answerAllAndFinish()

    await until(() => expect(path()).toBe(QUESTION_ROUTES.profile))
    expect(puts()).toHaveLength(1)
    expect(puts()[0].auth).toBe('Bearer access-1')
    expect(puts()[0].body).toEqual({
      expected_revision: 0,
      priorities: SAVED_PRIORITIES,
      answers: FIRST_OPTION_ANSWERS,
    })
  })

  it('opens the result only after the save, and keeps the answers when it fails', async () => {
    handlers['PUT /api/me/survey'] = () =>
      fail(500, 'INTERNAL_ERROR', '서버에 문제가 생겼어요.')
    await openSurvey()
    await answerAllAndFinish()

    expect(await until(() => screen.getByRole('alert'))).toHaveTextContent(
      '서버에 문제가 생겼어요.',
    )
    expect(path()).toBe(QUESTION_ROUTES.loading)

    handlers['PUT /api/me/survey'] = () => ok(SAVED)
    click('다시 시도')
    await until(() => expect(path()).toBe(QUESTION_ROUTES.profile))
    expect(puts()).toHaveLength(2)
    expect(puts()[1].body).toEqual(puts()[0].body)
  })

  it('does not finish a save for the previous account after another one signs in', async () => {
    let release: (response: Response) => void = () => {}
    handlers['PUT /api/me/survey'] = () =>
      new Promise<Response>((resolve) => {
        release = resolve
      })
    await openSurvey()
    await answerAllAndFinish()
    await until(() => expect(puts()).toHaveLength(1))

    act(() =>
      startSession({ accessToken: 'access-b', refreshToken: 'refresh-b' }),
    )
    await act(async () => release(ok(SAVED)))

    expect(await until(() => screen.getByRole('alert'))).toHaveTextContent(
      '다시 로그인',
    )
    expect(path()).toBe(QUESTION_ROUTES.loading)
    expect(puts()).toHaveLength(1)
  })

  it('shows the server message when the onboarding is not finished (409)', async () => {
    handlers['PUT /api/me/survey'] = () =>
      fail(409, 'ONBOARDING_REQUIRED', '온보딩을 먼저 완료해주세요.')
    await openSurvey()
    await answerAllAndFinish()

    expect(await until(() => screen.getByRole('alert'))).toHaveTextContent(
      '온보딩을 먼저 완료해주세요.',
    )
  })

  it('sends nothing while the server still has seven BEDTIME_H options', async () => {
    handlers['GET /api/surveys/current'] = () =>
      ok(schemaData({ bedtime: SPEC_BEDTIME_H_OPTIONS }))
    await openSurvey()
    const notes: (string | null)[] = []
    await answerAllAndFinish((index) => {
      notes[index] = screen.queryByRole('note')?.textContent ?? null
      pickFirst(index)
    })

    // Only the BEDTIME_H screen says it cannot be saved; the other questions carry on.
    expect(notes[2]).toContain('서버 설문과 선택지가 맞지 않아')
    expect(notes.filter((note) => note !== null)).toHaveLength(1)
    // The five Figma options are still the ones on screen.
    expect(getQuestionStep(2).question.options).toHaveLength(5)

    const alert = await until(() => screen.getByRole('alert'))
    expect(alert).toHaveTextContent('저장할 수 없어요 (BEDTIME_H)')
    // Trying again cannot help until the server survey changes.
    expect(
      screen.queryByRole('button', { name: '다시 시도' }),
    ).not.toBeInTheDocument()
    expect(puts()).toHaveLength(0)
  })

  it('shows a retry when the survey cannot be read', async () => {
    let failing = true
    handlers['GET /api/surveys/current'] = () =>
      failing
        ? fail(500, 'INTERNAL_ERROR', '서버에 문제가 생겼어요.')
        : ok(schemaData({ bedtime: FIVE_BEDTIME_H_OPTIONS }))
    renderAt(QUESTION_ROUTES.survey)

    expect(await until(() => screen.getByRole('alert'))).toHaveTextContent(
      '서버에 문제가 생겼어요.',
    )
    failing = false
    click('다시 시도')
    expect(
      await until(() => screen.getByLabelText('STEP 1 상황')),
    ).toBeInTheDocument()
  })
})

describe('server survey: onboarding priorities after a new sign-in', () => {
  it('uses the priorities saved with the onboarding without asking again', async () => {
    // A new session (as after closing the browser): nothing in memory, the saved
    // priorities come from GET /api/me/survey with revision 0 and no answers.
    await openSurvey()

    expect(path()).toBe(QUESTION_ROUTES.survey)
    await answerAllAndFinish()
    await until(() => expect(path()).toBe(QUESTION_ROUTES.profile))
    expect(puts()[0].body).toMatchObject({
      expected_revision: 0,
      priorities: SAVED_PRIORITIES,
    })
  })

  it('asks for the priorities before the questions when none can be read, and saves them with the survey', async () => {
    handlers['GET /api/me/survey'] = () => ok(mySurveyData())
    renderAt(QUESTION_ROUTES.survey)

    await until(() => expect(path()).toBe(ONBOARDING_ROUTES.priority))
    act(() => vi.advanceTimersByTime(MISSION_NOTICE_MS))
    click(/청소,청결/)
    click(/기상알람/)
    click(/흡연유무/)
    click('완료하기')
    await until(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    click('시작하기!')
    await until(() => screen.getByLabelText('STEP 1 상황'))
    await answerAllAndFinish()

    await until(() => expect(path()).toBe(QUESTION_ROUTES.profile))
    // The onboarding answers are not in memory, so only the survey saves the priorities.
    expect(callsTo('PUT', '/api/me/onboarding')).toHaveLength(0)
    expect(puts()[0].body).toMatchObject({
      expected_revision: 0,
      priorities: [
        { category_code: 'CLEANING', rank: 1 },
        { category_code: 'SLEEP_SCHEDULE', rank: 2 },
        { category_code: 'SMOKING', rank: 3 },
      ],
    })
  })
})

describe('server survey: home', () => {
  it('opens the my page from 내 설문 다시보기 and saves nothing', async () => {
    renderAt('/home')
    await until(() => screen.getByRole('link', { name: '내 설문 다시보기 →' }))

    fireEvent.click(screen.getByRole('link', { name: '내 설문 다시보기 →' }))

    expect(path()).toBe(MY_ROUTES.my)
    expect(
      screen.getByRole('button', { name: '설문조사 다시 하기' }),
    ).toBeInTheDocument()
    expect(puts()).toHaveLength(0)
  })
})

describe('server survey: saved answers', () => {
  const savedSurvey = (revision = 3, answers = FIRST_OPTION_ANSWERS) =>
    ok(
      mySurveyData({
        revision,
        completed: true,
        priorities: SAVED_PRIORITIES,
        answers,
      }),
    )

  it('shows the saved answers on the result for a new session', async () => {
    handlers['GET /api/me/survey'] = () => savedSurvey()
    renderAt(QUESTION_ROUTES.profile)

    expect(
      await until(() =>
        screen.getByRole('heading', { name: '상세 답변 요약' }),
      ),
    ).toBeInTheDocument()
    expect(path()).toBe(QUESTION_ROUTES.profile)
    expect(
      screen.getAllByText('자주 있다는 말을 들었다').length,
    ).toBeGreaterThan(0)
  })

  it('sends a new session without a saved survey to the survey', async () => {
    renderAt(QUESTION_ROUTES.profile)

    await until(() => screen.getByLabelText('STEP 1 상황'))
    expect(path()).toBe(QUESTION_ROUTES.survey)
  })

  it('selects the saved answers in the survey and saves an edit with the saved revision', async () => {
    handlers['GET /api/me/survey'] = () => savedSurvey(3)
    renderAt(QUESTION_ROUTES.survey)

    // An answered topic skips its STEP screen, and the saved option is selected.
    const first = await until(() =>
      screen.getByRole('radio', {
        name: '자주 있다는 말을 들었다',
      }),
    )
    expect(first).toBeChecked()

    await answerAllAndFinish((index) => {
      if (index === 15) {
        fireEvent.click(
          screen.getByRole('radio', { name: '흡연자와는 같은 방이 어렵다' }),
        )
      }
    })

    await until(() => expect(path()).toBe(QUESTION_ROUTES.profile))
    const body = puts()[0].body as {
      expected_revision: number
      priorities: unknown
      answers: { question_code: string; option_code: string }[]
    }
    expect(body.expected_revision).toBe(3)
    // Answers only: the saved priorities go back unchanged.
    expect(body.priorities).toEqual(SAVED_PRIORITIES)
    expect(body.answers[15]).toEqual({
      question_code: 'SMOKING_T',
      option_code: 'NON_SMOKER_ONLY',
    })
    expect(body.answers.slice(0, 15)).toEqual(FIRST_OPTION_ANSWERS.slice(0, 15))
  })

  it('ignores the saved answers once another account has signed in', async () => {
    let release: (response: Response) => void = () => {}
    handlers['GET /api/me/survey'] = () =>
      new Promise<Response>((resolve) => {
        release = resolve
      })
    renderAt(QUESTION_ROUTES.survey)
    await until(() => expect(callsTo('GET', '/api/me/survey')).toHaveLength(1))

    act(() =>
      startSession({ accessToken: 'access-b', refreshToken: 'refresh-b' }),
    )
    await act(async () => release(savedSurvey()))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    // Account A's answers are dropped. In the app the new session also remounts these screens
    // (SessionBoundary), which this test leaves out by starting the session directly.
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.getByText('설문을 불러오고 있어요')).toBeInTheDocument()
    expect(puts()).toHaveLength(0)
  })
})

describe('server survey: revision conflict (409)', () => {
  const NEWER = mySurveyData({
    revision: 5,
    completed: true,
    priorities: [
      { category_code: 'CLEANING', rank: 1 },
      { category_code: 'SMOKING', rank: 2 },
      { category_code: 'SLEEP_SCHEDULE', rank: 3 },
    ],
    answers: FIRST_OPTION_ANSWERS.map((answer) =>
      answer.question_code === 'SMOKING_T'
        ? { ...answer, option_code: 'NON_SMOKER_ONLY' }
        : answer,
    ),
  })

  async function reachConflict() {
    let conflictSent = false
    handlers['PUT /api/me/survey'] = () => {
      if (conflictSent) return ok({ ...SAVED, revision: 6 })
      conflictSent = true
      return fail(
        409,
        'SURVEY_REVISION_CONFLICT',
        '최신 설문을 다시 조회해주세요.',
      )
    }
    await openSurvey()
    handlers['GET /api/me/survey'] = () => ok(NEWER)
    await answerAllAndFinish()
    await until(() =>
      screen.getByRole('button', { name: '지금 답변으로 저장' }),
    )
  }

  it('reads the saved survey again and sends nothing until the user chooses', async () => {
    await reachConflict()

    expect(callsTo('GET', '/api/me/survey')).toHaveLength(2)
    expect(puts()).toHaveLength(1)
    expect(screen.getByRole('alert')).toHaveTextContent(
      '다른 곳에서 설문이 먼저 저장됐어요',
    )
    expect(path()).toBe(QUESTION_ROUTES.loading)
  })

  it('saves the answers on screen over the newer ones when the user asks', async () => {
    await reachConflict()
    click('지금 답변으로 저장')

    await until(() => expect(path()).toBe(QUESTION_ROUTES.profile))
    expect(puts()).toHaveLength(2)
    expect(puts()[1].body).toEqual({
      expected_revision: 5,
      priorities: SAVED_PRIORITIES,
      answers: FIRST_OPTION_ANSWERS,
    })
  })

  it('shows the newer saved answers when the user picks them, without saving', async () => {
    await reachConflict()
    click('저장된 답변 보기')

    await until(() => expect(path()).toBe(QUESTION_ROUTES.profile))
    expect(puts()).toHaveLength(1)
    expect(
      screen.getAllByText('흡연자와는 같은 방이 어렵다').length,
    ).toBeGreaterThan(0)
  })
})

describe('server survey: retake from the my page', () => {
  beforeEach(() => {
    handlers['GET /api/me/survey'] = () =>
      ok(
        mySurveyData({
          revision: 2,
          completed: true,
          priorities: SAVED_PRIORITIES,
          answers: FIRST_OPTION_ANSWERS,
        }),
      )
  })

  async function startRetake() {
    renderAt(MY_ROUTES.my)
    await until(() =>
      screen.getByRole('button', { name: '설문조사 다시 하기' }),
    )
    click('설문조사 다시 하기')
    click('다시 하기')
  }

  async function chooseNewPrioritiesAndStart() {
    act(() => vi.advanceTimersByTime(MISSION_NOTICE_MS))
    click(/개인청결/)
    click(/흡연유무/)
    click(/잠버릇/)
    click('완료하기')
    await until(() => expect(path()).toBe(ONBOARDING_ROUTES.complete))
    click('시작하기!')
  }

  const pickSmokingRoommateOnlyNonSmoker = (index: number) =>
    index === 15
      ? fireEvent.click(
          screen.getByRole('radio', { name: '흡연자와는 같은 방이 어렵다' }),
        )
      : pickFirst(index)

  it('keeps showing the saved answers on the result while a retake is unfinished', async () => {
    await startRetake()
    expect(path()).toBe(ONBOARDING_ROUTES.priority)

    click('probe: open result')

    await until(() => screen.getByRole('heading', { name: '상세 답변 요약' }))
    expect(path()).toBe(QUESTION_ROUTES.profile)
    expect(screen.getAllByText('흡연 여부는 상관없다').length).toBeGreaterThan(
      0,
    )
  })

  it('shows the saved answers, not a retake whose save failed', async () => {
    handlers['PUT /api/me/survey'] = () =>
      fail(500, 'INTERNAL_ERROR', '서버에 문제가 생겼어요.')
    await startRetake()
    await chooseNewPrioritiesAndStart()
    await until(() => screen.getByLabelText('STEP 1 상황'))
    await answerAllAndFinish(pickSmokingRoommateOnlyNonSmoker)
    await until(() => screen.getByRole('alert'))

    click('probe: open result')

    await until(() => screen.getByRole('heading', { name: '상세 답변 요약' }))
    expect(screen.getAllByText('흡연 여부는 상관없다').length).toBeGreaterThan(
      0,
    )
    expect(
      screen.queryByText('흡연자와는 같은 방이 어렵다'),
    ).not.toBeInTheDocument()
  })

  it('starts over, saves the new priorities with the survey and never the onboarding', async () => {
    await startRetake()

    // A new session holds no onboarding answers, yet the retake opens the priority step.
    expect(path()).toBe(ONBOARDING_ROUTES.priority)
    await chooseNewPrioritiesAndStart()

    // The saved answers do not come back for a retake.
    await until(() => screen.getByLabelText('STEP 1 상황'))
    expect(
      screen.queryByRole('radio', { checked: true }),
    ).not.toBeInTheDocument()
    await answerAllAndFinish()

    await until(() => expect(path()).toBe(QUESTION_ROUTES.profile))
    expect(callsTo('PUT', '/api/me/onboarding')).toHaveLength(0)
    expect(puts()[0].body).toEqual({
      expected_revision: 2,
      priorities: [
        { category_code: 'PERSONAL_HYGIENE', rank: 1 },
        { category_code: 'SMOKING', rank: 2 },
        { category_code: 'SLEEP_HABITS', rank: 3 },
      ],
      answers: FIRST_OPTION_ANSWERS,
    })
  })
})
