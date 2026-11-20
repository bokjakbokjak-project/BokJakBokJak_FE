import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { MISSION_NOTICE_MS } from '../../components/onboarding/MissionNotice'
import { clearTokens } from '../../lib/auth/tokenStore'
import { resetGoogleIdentityForTests } from '../../lib/auth/googleIdentity'
import { finishSituation } from '../../test/questionFade'
import {
  FIVE_BEDTIME_H_OPTIONS,
  mySurveyData,
  profileData,
  schemaData,
} from '../../test/surveyFixture'
import { shownQuestion } from '../../test/shownQuestion'
import { QUESTION_COUNT, QUESTION_ROUTES } from '../question/questionData'

/**
 * The recommendation list after a survey save, in server mode, against a stand-in backend that
 * follows the Notion spec: the server keeps the computed list and computes it again from the
 * latest survey on the next GET /api/recommendations after the survey changed (채희 7.1), and
 * PUT /api/me/survey returns a new revision only for a real change. Ids and names are test values.
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

const recommendation = (id: number, name: string, score: number | null) => ({
  user_id: id,
  nickname: name,
  department: '컴퓨터공학과',
  age: 21,
  top_categories: ['SMOKING', 'CLEANING', 'PERSONAL_HYGIENE'],
  match_score: score,
  relation: 'NONE',
})
const list = (...items: ReturnType<typeof recommendation>[]) =>
  ok({ recommendations: items, total_count: items.length })

/** Before the survey change: 가람 first at 82%. */
const OLD_LIST = () =>
  list(recommendation(12, '가람', 82), recommendation(13, '나래', 60))
/** After it: the order and the rates changed. */
const NEW_LIST = () =>
  list(recommendation(13, '나래', 91), recommendation(12, '가람', 40))

const SAVED_PRIORITIES = [
  { category_code: 'SMOKING', rank: 1 },
  { category_code: 'CLEANING', rank: 2 },
  { category_code: 'SLEEP_HABITS', rank: 3 },
]
const saveAnswer = (revision: number) =>
  ok({
    revision,
    survey_completed: true,
    submitted_at: '2026-11-16T05:00:00Z',
    next_step: 'HOME',
  })

type Call = { method: string; path: string }
let calls: Call[]
type Handler = (call: Call) => Response | Promise<Response>
let handlers: Record<string, Handler>

const callsTo = (method: string, path: string) =>
  calls.filter((call) => call.method === method && call.path === path)
const listReads = () => callsTo('GET', '/api/recommendations')

/** A response that answers only when `release` is called. */
function held() {
  let release: (response: Response) => void = () => {}
  const promise = new Promise<Response>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

// A stand-in for Google Identity Services that hands the credential to the page on demand.
let googleConfig: {
  callback: (response: { credential?: string }) => void
} | null
const google = {
  initialize: vi.fn((config) => {
    googleConfig = config
  }),
  renderButton: vi.fn((parent: HTMLElement) => {
    const button = document.createElement('div')
    button.setAttribute('role', 'button')
    button.textContent = 'Google'
    parent.appendChild(button)
  }),
  prompt: vi.fn(),
  disableAutoSelect: vi.fn(),
}

const PROBES = {
  roommate: '/roommate',
  survey: QUESTION_ROUTES.survey,
  my: '/my',
  login: '/',
  analysis: '/roommate/12',
  detail: '/roommate/12/profile',
} as const

function LocationProbe() {
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="path">{useLocation().pathname}</output>
      {Object.entries(PROBES).map(([name, to]) => (
        <button key={name} type="button" onClick={() => navigate(to)}>
          {`probe: ${name}`}
        </button>
      ))}
    </>
  )
}
const path = () => screen.getByTestId('path').textContent
const go = (name: keyof typeof PROBES) =>
  fireEvent.click(screen.getByRole('button', { name: `probe: ${name}` }))

beforeEach(() => {
  calls = []
  let refreshCount = 0
  handlers = {
    'GET /api/recommendations': OLD_LIST,
    'GET /api/surveys/current': () =>
      ok(schemaData({ bedtime: FIVE_BEDTIME_H_OPTIONS })),
    'GET /api/me/survey': () =>
      ok(mySurveyData({ revision: 1, priorities: SAVED_PRIORITIES })),
    'PUT /api/me/survey': () => saveAnswer(2),
    'GET /api/me/profile': () => ok(profileData()),
    'GET /api/notifications/unread-count': () => ok({ count: 0 }),
    'GET /api/matchings/me': () => ok({ rooms: [] }),
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const call = {
        method: init.method ?? 'GET',
        path: url.slice(BASE.length),
      }
      calls.push(call)
      if (call.path === '/api/auth/refresh') {
        refreshCount += 1
        return ok(tokens(refreshCount))
      }
      const handler = handlers[`${call.method} ${call.path}`]
      return handler ? handler(call) : fail(404, 'NOT_FOUND', 'not found')
    }),
  )
  vi.stubEnv('VITE_API_MODE', 'server')
  vi.stubEnv('VITE_API_BASE_URL', BASE)
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client.apps.googleusercontent.com')
  googleConfig = null
  window.google = { accounts: { id: google } }
  resetGoogleIdentityForTests()
  clearTokens()
  // A stored session, restored when the app starts, as after a reload.
  sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  delete window.google
  clearTokens()
})

/** Runs `check` until it passes, advancing the fake clock in between. */
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
/** Lets pending requests settle. */
const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(50)
  })

function renderAt(route: string) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  )
}

/** The candidate cards in order, as `name rate`. */
const cards = () =>
  screen
    .queryAllByRole('link', { name: /가람|나래|다온/ })
    .map((card) => card.textContent?.replace(/\s+/g, ' ') ?? '')
const cardOrder = () =>
  cards().map((text) => (/가람|나래|다온/.exec(text) ?? [''])[0])
/** The big ring of the analysis and the detail profile, whose number and `%` are split. */
const bigRate = (text: string) =>
  screen.queryByText(
    (_, element) => element?.tagName === 'P' && element.textContent === text,
  )

/** Opens the list and waits for the first answer. */
async function openList() {
  renderAt('/roommate')
  await until(() => expect(cardOrder()).toEqual(['가람', '나래']))
}

/** Answers every question with its first option and waits out the loading screen. */
async function retakeSurvey() {
  go('survey')
  await until(() => screen.getByLabelText('STEP 1 상황'))
  for (let index = 0; index < QUESTION_COUNT; index += 1) {
    if (index % 2 === 0 && screen.queryByLabelText(/^STEP \d+ 상황$/)) {
      finishSituation()
    }
    fireEvent.click(
      screen.getByRole('radio', {
        name: shownQuestion().question.options[0],
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: '다음으로' }))
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000)
  })
  await until(() => expect(callsTo('PUT', '/api/me/survey')).toHaveLength(1))
  await settle()
}

describe('recommendations: reading once', () => {
  it('reads the list on the first visit and not again when coming back', async () => {
    await openList()
    expect(listReads()).toHaveLength(1)
    expect(cards()[0]).toContain('매칭률 82%')

    go('my')
    await until(() => expect(path()).toBe('/my'))
    go('roommate')
    await until(() => expect(cardOrder()).toEqual(['가람', '나래']))
    await settle()
    expect(listReads()).toHaveLength(1)
  })
})

describe('recommendations after a survey save', () => {
  it('reads the list again after a save with a new revision, without a refresh request', async () => {
    await openList()
    await retakeSurvey()
    await until(() => expect(path()).toBe(QUESTION_ROUTES.profile))

    // The new list is held, so the old one would show now if it were kept.
    const answer = held()
    handlers['GET /api/recommendations'] = () => answer.promise
    go('roommate')
    await until(() => expect(listReads()).toHaveLength(2))
    expect(cards()).toEqual([])
    expect(
      screen.getByText('추천 목록을 불러오는 중이에요'),
    ).toBeInTheDocument()

    await act(async () => answer.release(NEW_LIST()))
    await until(() => expect(cardOrder()).toEqual(['나래', '가람']))
    expect(cards()[0]).toContain('매칭률 91%')
    expect(cards()[1]).toContain('매칭률 40%')
    expect(callsTo('POST', '/api/recommendations/refresh')).toHaveLength(0)

    // Fresh again: coming back does not ask a third time.
    go('my')
    await until(() => expect(path()).toBe('/my'))
    go('roommate')
    await until(() => expect(cardOrder()).toEqual(['나래', '가람']))
    await settle()
    expect(listReads()).toHaveLength(2)
  })

  it('keeps the list when the save fails', async () => {
    handlers['PUT /api/me/survey'] = () =>
      fail(500, 'INTERNAL_ERROR', '서버에 문제가 생겼어요.')
    await openList()
    await retakeSurvey()
    await until(() => screen.getByRole('alert'))

    go('roommate')
    await until(() => expect(cardOrder()).toEqual(['가람', '나래']))
    await settle()
    expect(listReads()).toHaveLength(1)
  })

  it('keeps the list on a revision conflict', async () => {
    handlers['PUT /api/me/survey'] = () =>
      fail(409, 'SURVEY_REVISION_CONFLICT', '최신 설문을 다시 조회해주세요.')
    await openList()
    await retakeSurvey()
    // The conflict asks the user to choose; nothing has been saved.
    await until(() =>
      screen.getByRole('button', { name: '지금 답변으로 저장' }),
    )

    go('roommate')
    await until(() => expect(cardOrder()).toEqual(['가람', '나래']))
    await settle()
    expect(listReads()).toHaveLength(1)
  })

  it('keeps the list when the save returns the same revision (nothing changed)', async () => {
    handlers['PUT /api/me/survey'] = () => saveAnswer(1)
    await openList()
    await retakeSurvey()
    await until(() => expect(path()).toBe(QUESTION_ROUTES.profile))

    go('roommate')
    await until(() => expect(cardOrder()).toEqual(['가람', '나래']))
    await settle()
    expect(listReads()).toHaveLength(1)
  })

  it('drops an answer for the old survey that arrives late', async () => {
    const old = held()
    handlers['GET /api/recommendations'] = () => old.promise
    renderAt('/roommate')
    await until(() => expect(listReads()).toHaveLength(1))

    // The survey is saved while the first read is still out.
    await retakeSurvey()
    handlers['GET /api/recommendations'] = NEW_LIST
    go('roommate')
    await until(() => expect(cardOrder()).toEqual(['나래', '가람']))

    await act(async () => old.release(OLD_LIST()))
    await settle()
    expect(cardOrder()).toEqual(['나래', '가람'])
    expect(cards()[0]).toContain('매칭률 91%')
  })

  it('does not show an answer for the old survey that arrived after the save', async () => {
    const old = held()
    handlers['GET /api/recommendations'] = () => old.promise
    renderAt('/roommate')
    await until(() => expect(listReads()).toHaveLength(1))
    await retakeSurvey()

    // The first read answers while the user is still on the result screen.
    await act(async () => old.release(OLD_LIST()))
    await settle()

    const fresh = held()
    handlers['GET /api/recommendations'] = () => fresh.promise
    go('roommate')
    await until(() => expect(listReads()).toHaveLength(2))
    expect(cards()).toEqual([])

    await act(async () => fresh.release(NEW_LIST()))
    await until(() => expect(cardOrder()).toEqual(['나래', '가람']))
  })

  it('drops a refresh asked before the save, even when it answers after the new list', async () => {
    await openList()
    const refresh = held()
    handlers['POST /api/recommendations/refresh'] = () => refresh.promise
    fireEvent.click(screen.getByRole('button', { name: /새로고침/ }))
    await until(() =>
      expect(callsTo('POST', '/api/recommendations/refresh')).toHaveLength(1),
    )

    // The user leaves while the refresh is out, saves a changed survey and comes back.
    await retakeSurvey()
    handlers['GET /api/recommendations'] = NEW_LIST
    go('roommate')
    await until(() => expect(cardOrder()).toEqual(['나래', '가람']))

    // The refresh was computed from the old survey.
    await act(async () =>
      refresh.release(
        ok({
          changed: true,
          recommendations: [recommendation(19, '다온', 99)],
          total_count: 1,
        }),
      ),
    )
    await settle()
    expect(cardOrder()).toEqual(['나래', '가람'])
    expect(cards()[0]).toContain('매칭률 91%')
  })

  it('keeps the newer refresh when an older one answers last', async () => {
    await openList()
    const first = held()
    handlers['POST /api/recommendations/refresh'] = () => first.promise
    fireEvent.click(screen.getByRole('button', { name: /새로고침/ }))
    await until(() =>
      expect(callsTo('POST', '/api/recommendations/refresh')).toHaveLength(1),
    )

    // Leaving and opening the list again allows a second refresh while the first is out.
    go('my')
    await until(() => expect(path()).toBe('/my'))
    go('roommate')
    await until(() => expect(cardOrder()).toEqual(['가람', '나래']))
    handlers['POST /api/recommendations/refresh'] = () =>
      ok({
        changed: true,
        recommendations: [recommendation(19, '다온', 99)],
        total_count: 1,
      })
    fireEvent.click(screen.getByRole('button', { name: /새로고침/ }))
    await until(() => expect(cardOrder()).toEqual(['다온']))

    await act(async () =>
      first.release(
        ok({
          changed: true,
          recommendations: [recommendation(13, '나래', 91)],
          total_count: 1,
        }),
      ),
    )
    await settle()
    expect(cardOrder()).toEqual(['다온'])
    expect(cards()[0]).toContain('매칭률 99%')
  })

  it('drops an older refresh that answers first and keeps the newer one', async () => {
    await openList()
    const first = held()
    const second = held()
    handlers['POST /api/recommendations/refresh'] = () => first.promise
    fireEvent.click(screen.getByRole('button', { name: /새로고침/ }))
    await until(() =>
      expect(callsTo('POST', '/api/recommendations/refresh')).toHaveLength(1),
    )
    go('my')
    await until(() => expect(path()).toBe('/my'))
    go('roommate')
    await until(() => expect(cardOrder()).toEqual(['가람', '나래']))
    handlers['POST /api/recommendations/refresh'] = () => second.promise
    fireEvent.click(screen.getByRole('button', { name: /새로고침/ }))
    await until(() =>
      expect(callsTo('POST', '/api/recommendations/refresh')).toHaveLength(2),
    )

    // The older one answers first: it is not the newest, so the list stays.
    await act(async () =>
      first.release(
        ok({
          changed: true,
          recommendations: [recommendation(13, '나래', 91)],
          total_count: 1,
        }),
      ),
    )
    await settle()
    expect(cardOrder()).toEqual(['가람', '나래'])

    await act(async () =>
      second.release(
        ok({
          changed: true,
          recommendations: [recommendation(19, '다온', 99)],
          total_count: 1,
        }),
      ),
    )
    await until(() => expect(cardOrder()).toEqual(['다온']))
  })

  it('drops a refresh when the list was read again after it (a chat request)', async () => {
    handlers['GET /api/recommendations/12/analysis'] = () =>
      ok({
        target: {
          user_id: 12,
          nickname: '가람',
          age: 21,
          department: '컴퓨터공학과',
          top_categories: ['SMOKING'],
        },
        match_score: 82,
        good_points: ['아침형 생활이 잘 맞아요.'],
        adjust_points: [],
        check_points: [],
      })
    handlers['POST /api/matchings'] = () => ok({ matching_id: 45 })
    await openList()
    const refresh = held()
    handlers['POST /api/recommendations/refresh'] = () => refresh.promise
    fireEvent.click(screen.getByRole('button', { name: /새로고침/ }))
    await until(() =>
      expect(callsTo('POST', '/api/recommendations/refresh')).toHaveLength(1),
    )

    // A chat request reads the list again, so 가람's relation shows.
    handlers['GET /api/recommendations'] = () =>
      list(
        { ...recommendation(12, '가람', 82), relation: 'CHATTING' },
        recommendation(13, '나래', 60),
      )
    go('analysis')
    fireEvent.click(
      await until(() => screen.getByRole('button', { name: '대화 요청하기' })),
    )
    await until(() => expect(listReads()).toHaveLength(2))
    await settle()

    await act(async () =>
      refresh.release(
        ok({
          changed: true,
          recommendations: [recommendation(19, '다온', 99)],
          total_count: 1,
        }),
      ),
    )
    await settle()
    go('roommate')
    await until(() => expect(cardOrder()).toEqual(['가람', '나래']))
    expect(listReads()).toHaveLength(2)
  })

  it('reads the list again after each changed save', async () => {
    let revision = 1
    handlers['GET /api/me/survey'] = () =>
      ok(mySurveyData({ revision, priorities: SAVED_PRIORITIES }))
    handlers['PUT /api/me/survey'] = () => {
      revision += 1
      return saveAnswer(revision)
    }
    await openList()

    await retakeSurvey()
    handlers['GET /api/recommendations'] = NEW_LIST
    go('roommate')
    await until(() => expect(cardOrder()).toEqual(['나래', '가람']))
    expect(listReads()).toHaveLength(2)

    // A second save in the same session, through the my page's retake (the next revision).
    go('my')
    await until(() =>
      screen.getByRole('button', { name: '설문조사 다시 하기' }),
    )
    fireEvent.click(screen.getByRole('button', { name: '설문조사 다시 하기' }))
    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }))
    await until(() => screen.getByRole('button', { name: '다음으로' }))
    act(() => vi.advanceTimersByTime(MISSION_NOTICE_MS))
    // The retake starts from the current priorities; clear them to choose again.
    for (const card of screen.queryAllByRole('button', { pressed: true })) {
      fireEvent.click(card)
    }
    for (const category of [/개인청결/, /흡연유무/, /잠버릇/]) {
      fireEvent.click(screen.getByRole('button', { name: category }))
    }
    fireEvent.click(
      screen.getByRole('button', { name: /^(수정하기|다음으로)$/ }),
    )
    await until(() => screen.getByRole('button', { name: '시작하기!' }))
    fireEvent.click(screen.getByRole('button', { name: '시작하기!' }))
    await until(() => screen.getByLabelText('STEP 1 상황'))
    for (let index = 0; index < QUESTION_COUNT; index += 1) {
      if (index % 2 === 0 && screen.queryByLabelText(/^STEP \d+ 상황$/)) {
        finishSituation()
      }
      fireEvent.click(
        screen.getByRole('radio', {
          name: shownQuestion().question.options[0],
        }),
      )
      fireEvent.click(screen.getByRole('button', { name: '다음으로' }))
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    await until(() => expect(callsTo('PUT', '/api/me/survey')).toHaveLength(2))
    await settle()
    expect(callsTo('PUT', '/api/me/survey')).toHaveLength(2)

    handlers['GET /api/recommendations'] = () =>
      list(recommendation(19, '다온', 77))
    go('roommate')
    await until(() => expect(cardOrder()).toEqual(['다온']))
    expect(listReads()).toHaveLength(3)
    expect(callsTo('POST', '/api/recommendations/refresh')).toHaveLength(0)
  })

  it('shows the empty state when no candidate is left after the save', async () => {
    await openList()
    await retakeSurvey()
    handlers['GET /api/recommendations'] = () => list()
    go('roommate')

    await until(() => screen.getByText('아직 추천할 수 있는 후보가 없어요'))
    expect(cards()).toEqual([])
  })

  it('does not show the old match rate on the detail profile before the new list is read', async () => {
    handlers['GET /api/roommates/12/profile'] = () =>
      ok(profileData({ candidateId: 12, nickname: '가람' }))
    handlers['GET /api/users/12/lifestyle-summary'] = () =>
      ok({ summary: '조용한 편이에요.', keywords: [] })
    await openList()
    go('detail')
    await until(() => expect(bigRate('82%')).toBeInTheDocument())

    await retakeSurvey()
    go('detail')
    await until(() => screen.getByText('조용한 편이에요.'))
    // The profile has no score, so the ring is left out until the new list is read.
    expect(bigRate('82%')).toBeNull()
  })
})

describe('recommendations: other screens and features', () => {
  it('reads the AI analysis on every visit, so a save is reflected without a cache', async () => {
    let analysis = '아침형 생활이 잘 맞아요.'
    handlers['GET /api/recommendations/12/analysis'] = () =>
      ok({
        target: {
          user_id: 12,
          nickname: '가람',
          age: 21,
          department: '컴퓨터공학과',
          top_categories: ['SMOKING'],
        },
        match_score: 82,
        good_points: [analysis],
        adjust_points: [],
        check_points: [],
      })
    await openList()
    go('analysis')
    await until(() => screen.getByText('아침형 생활이 잘 맞아요.'))

    await retakeSurvey()
    analysis = '청소 주기가 비슷해요.'
    go('analysis')
    await until(() => screen.getByText('청소 주기가 비슷해요.'))
    expect(screen.queryByText('아침형 생활이 잘 맞아요.')).toBeNull()
    expect(callsTo('GET', '/api/recommendations/12/analysis')).toHaveLength(2)
  })

  it('keeps 리스트 더보기 and the refresh button working after a reload for a new survey', async () => {
    await openList()
    await retakeSurvey()
    handlers['GET /api/recommendations'] = () =>
      list(
        ...[13, 14, 15, 16, 17, 18].map((id) =>
          recommendation(id, id === 13 ? '나래' : `후보${id}`, 90 - id),
        ),
      )
    go('roommate')
    await until(() =>
      expect(screen.getAllByRole('link', { name: /나래|후보/ })).toHaveLength(
        5,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: /리스트 더보기/ }))
    expect(screen.getAllByRole('link', { name: /나래|후보/ })).toHaveLength(6)

    handlers['POST /api/recommendations/refresh'] = () =>
      ok({
        changed: true,
        recommendations: [recommendation(19, '다온', 99)],
        total_count: 1,
      })
    fireEvent.click(screen.getByRole('button', { name: /새로고침/ }))
    await until(() => expect(cardOrder()).toEqual(['다온']))
    expect(listReads()).toHaveLength(2)
    expect(callsTo('POST', '/api/recommendations/refresh')).toHaveLength(1)
  })

  it('does not show the previous account’s list to the next account', async () => {
    await openList()

    // Another account signs in from the login screen while signed in.
    handlers['POST /api/auth/login'] = () =>
      ok({
        ...tokens(9),
        user_id: 77,
        university_id: 1,
        onboarding_completed: true,
        survey_completed: true,
        next_step: 'HOME',
      })
    go('login')
    await until(() => expect(google.renderButton).toHaveBeenCalled())
    await act(async () => {
      googleConfig?.callback({ credential: 'google-id-token' })
    })
    await until(() => expect(path()).toBe('/home'))

    const answer = held()
    handlers['GET /api/recommendations'] = () => answer.promise
    go('roommate')
    await until(() => expect(listReads()).toHaveLength(2))
    expect(cards()).toEqual([])

    await act(async () => answer.release(list(recommendation(19, '다온', 70))))
    await until(() => expect(cardOrder()).toEqual(['다온']))
  })
})
