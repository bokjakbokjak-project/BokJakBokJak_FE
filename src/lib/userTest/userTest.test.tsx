import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { clearTokens, startSession } from '../auth/tokenStore'
import { isUserTestEnabled } from './config'
import { usesServerData } from './experience'
import {
  finishPrompt,
  queuePrompt,
  retryDeliveries,
  showNextPrompt,
} from './feedback'
import { recordSurveySaved } from './progress'
import { userTestRouteAfterSignIn } from './signIn'
import { testOnboardingPatch } from './testProfile'
import {
  getParticipantId,
  getUserTestState,
  isUserTestDemo,
  resetUserTestForTests,
  setExperienceMode,
  startParticipant,
} from './userTestStore'

const BASE = 'https://api.example.test'

type Call = { method: string; path: string; body: unknown }
let calls: Call[]
let respond: (call: Call) => Response | undefined

const ok = (data: unknown) =>
  new Response(
    JSON.stringify({ success: true, code: 'OK', message: '성공', data }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )

function useUserTestEnv(extra: Record<string, string> = {}) {
  vi.stubEnv('VITE_API_MODE', 'server')
  vi.stubEnv('VITE_API_BASE_URL', BASE)
  vi.stubEnv('VITE_USER_TEST', 'true')
  vi.stubEnv('VITE_USER_TEST_COHORT', 'test-round')
  vi.stubEnv('VITE_USER_TEST_GENDER', 'FEMALE')
  vi.stubEnv('VITE_USER_TEST_BIRTH_YEAR', '2005')
  vi.stubEnv('VITE_USER_TEST_DEPARTMENT', '테스트학과')
  vi.stubEnv('VITE_USER_TEST_STUDENT_NUMBER', '20260000')
  vi.stubEnv('VITE_USER_TEST_DORMITORY', '테스트 기숙사')
  for (const [key, value] of Object.entries(extra)) vi.stubEnv(key, value)
}

const NEW_TESTER = { onboardingCompleted: false, surveyCompleted: false }

beforeEach(() => {
  calls = []
  respond = () => undefined
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
      const response = respond(call)
      if (!response) throw new Error(`unexpected ${call.method} ${call.path}`)
      return response
    }),
  )
  clearTokens()
  resetUserTestForTests()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  clearTokens()
  resetUserTestForTests()
})

describe('switch', () => {
  it('stays off without the flag, so the production build is unchanged', () => {
    vi.stubEnv('VITE_API_MODE', 'server')
    vi.stubEnv('VITE_USER_TEST_COHORT', 'test-round')
    expect(isUserTestEnabled()).toBe(false)
    expect(
      userTestRouteAfterSignIn({
        userId: 12,
        universityId: 1,
        nextStep: 'ONBOARDING',
        ...NEW_TESTER,
      }),
    ).toBeNull()
    expect(getParticipantId()).toBeNull()
  })

  it('needs a cohort as well as the flag', () => {
    useUserTestEnv({ VITE_USER_TEST_COHORT: '' })
    expect(isUserTestEnabled()).toBe(false)
  })
})

describe('sign-in and basic information', () => {
  it('opens the start screen and fills in the shared values with an anonymous name', () => {
    useUserTestEnv()
    startSession({ accessToken: 'a', refreshToken: 'r' })
    expect(
      userTestRouteAfterSignIn({
        userId: 12,
        universityId: 1,
        nextStep: 'ONBOARDING',
        ...NEW_TESTER,
      }),
    ).toBe('/user-test')
    expect(testOnboardingPatch()).toEqual({
      name: '테스터012',
      department: '테스트학과',
      studentId: '20260000',
      gender: 'female',
      birthYear: 2005,
      dormitory: '테스트 기숙사',
      roomCapacity: 2,
      selectedDormitory: null,
    })
  })

  it('leaves a tester with a saved survey on the server’s route, and keeps what the server knows', () => {
    useUserTestEnv()
    expect(
      userTestRouteAfterSignIn({
        userId: 7,
        universityId: 1,
        nextStep: 'HOME',
        onboardingCompleted: true,
        surveyCompleted: true,
      }),
    ).toBeNull()
    expect(getUserTestState()).toMatchObject({
      onboardingCompleted: true,
      surveyCompleted: true,
    })
  })

  it('fills in nothing while a shared value is missing', () => {
    useUserTestEnv({ VITE_USER_TEST_DORMITORY: '' })
    startParticipant(12, NEW_TESTER)
    expect(testOnboardingPatch()).toBeNull()
  })
})

describe('state per tester', () => {
  it('keeps the mode per account and forgets the tester with the session', () => {
    useUserTestEnv()
    startSession({ accessToken: 'a', refreshToken: 'r' })
    startParticipant(1, NEW_TESTER)
    setExperienceMode('demo')
    expect(isUserTestDemo()).toBe(true)
    expect(usesServerData()).toBe(false)

    startParticipant(2, NEW_TESTER)
    expect(isUserTestDemo()).toBe(false)
    expect(usesServerData()).toBe(true)

    startParticipant(1, NEW_TESTER)
    expect(isUserTestDemo()).toBe(true)

    clearTokens()
    expect(getParticipantId()).toBeNull()
    expect(isUserTestDemo()).toBe(false)
  })
})

describe('feedback', () => {
  it('shows each question once, keeps a snapshot, and keeps answers on the device without the collection API', () => {
    useUserTestEnv()
    startParticipant(3, NEW_TESTER)

    // Leaving the survey for the browse mode queues nothing; a saved survey queues Q1.
    expect(showNextPrompt(['q1_discovery'], 3)).toBeNull()
    recordSurveySaved()
    const shown = showNextPrompt(['q1_discovery'], 16)
    expect(shown).toMatchObject({
      questionId: 'q1_discovery',
      status: 'shown',
      experienceMode: 'live',
      dataSource: 'real',
      surveyStatus: 'completed',
      optionId: null,
    })

    finishPrompt('q1_discovery', { optionId: 'new_criteria', comment: '  ' })
    expect(getUserTestState().feedback.q1_discovery).toMatchObject({
      status: 'answered',
      optionId: 'new_criteria',
      comment: null,
      delivery: 'local',
    })

    // Answered once: it is never queued or shown again in this cohort.
    recordSurveySaved()
    expect(showNextPrompt(['q1_discovery'], 16)).toBeNull()
    expect(calls.filter((call) => call.path.includes('feedback'))).toEqual([])
  })

  it('keeps an example answer as example after going back to the real flow', () => {
    useUserTestEnv()
    startParticipant(4, NEW_TESTER)
    setExperienceMode('demo')
    queuePrompt('q2_understanding', 'sujeong', 'example')
    showNextPrompt(['q2_understanding'], 0)
    finishPrompt('q2_understanding', null)

    setExperienceMode('live')
    queuePrompt('q2_understanding', '12', 'real')
    expect(showNextPrompt(['q2_understanding'], 16)).toBeNull()
    expect(getUserTestState().feedback.q2_understanding).toMatchObject({
      status: 'skipped',
      experienceMode: 'demo',
      dataSource: 'example',
      targetProfileId: 'sujeong',
      surveyStatus: 'not_started',
    })
  })

  it('sends with the same key again after a failure, and the next screen can go on meanwhile', async () => {
    useUserTestEnv({ VITE_USER_TEST_FEEDBACK_API: 'on' })
    startSession({ accessToken: 'a', refreshToken: 'r' })
    startParticipant(5, NEW_TESTER)
    let fail = true
    respond = (call) => {
      if (call.path !== '/api/user-test/feedback/q3_negotiation') return
      if (fail) {
        return new Response(
          JSON.stringify({ success: false, code: 'ERR', message: 'x' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return ok({ saved: true })
    }

    queuePrompt('q3_negotiation', '12', 'real')
    showNextPrompt(['q3_negotiation'], 16)
    finishPrompt('q3_negotiation', {
      optionId: 'topics_only',
      comment: '청소 주기',
    })
    await waitFor(() =>
      expect(
        calls.filter((call) => call.method === 'PUT').length,
      ).toBeGreaterThan(0),
    )
    expect(getUserTestState().feedback.q3_negotiation?.delivery).toBe('pending')

    fail = false
    retryDeliveries()
    await waitFor(() =>
      expect(getUserTestState().feedback.q3_negotiation?.delivery).toBe('sent'),
    )
    const puts = calls.filter((call) => call.method === 'PUT')
    expect(new Set(puts.map((call) => call.path))).toEqual(
      new Set(['/api/user-test/feedback/q3_negotiation']),
    )
    expect(puts.at(-1)?.body).toMatchObject({
      campaign_id: 'test-round',
      status: 'answered',
      option_id: 'topics_only',
      comment: '청소 주기',
      data_source: 'real',
    })
    // The participant is never sent: the server takes it from the token.
    expect(JSON.stringify(puts)).not.toContain('participant')
  })
})

function LocationProbe() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe('browse mode screens', () => {
  it('shows the example list and comparison with no service request, then asks Q3 after the comparison', async () => {
    useUserTestEnv()
    startSession({ accessToken: 'a', refreshToken: 'r' })
    startParticipant(9, NEW_TESTER)
    setExperienceMode('demo')
    renderAt('/roommate')

    expect(
      await screen.findByText(
        '둘러보기 모드예요. 프로필과 매칭률은 예시입니다.',
      ),
    ).toBeInTheDocument()
    const cards = await screen.findAllByRole('link', { name: /예시 매칭률/ })
    fireEvent.click(cards[0])
    expect(await screen.findByText(/님과의 나의 매칭결과/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: '이전' }))
    const sheet = await screen.findByRole('dialog', {
      name: '예시 화면에서 두 사람이 어떤 부분을 이야기해봐야 할지 알겠나요?',
    })
    const answer = screen.getByRole('button', { name: '답변하고 계속하기' })
    expect(answer).toBeDisabled()
    expect(sheet.querySelector('input:checked')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: /서로 양보할 수 있는/ }))
    expect(answer).toBeEnabled()
    fireEvent.click(answer)
    expect(screen.queryByRole('dialog')).toBeNull()

    // Only the session refresh went out: no profile, recommendation or chat request.
    expect(calls.filter((call) => call.path !== '/api/auth/refresh')).toEqual(
      [],
    )
    expect(getUserTestState().feedback.q3_negotiation).toMatchObject({
      dataSource: 'example',
      experienceMode: 'demo',
    })
  })

  it('offers the examples again from the real flow, also after the survey', async () => {
    useUserTestEnv()
    startSession({ accessToken: 'a', refreshToken: 'r' })
    startParticipant(11, {
      onboardingCompleted: true,
      surveyCompleted: true,
    })
    respond = () => ok({ rooms: [] })
    renderAt('/chat')

    fireEvent.click(
      await screen.findByRole('button', { name: '예시로 둘러보기' }),
    )
    expect(isUserTestDemo()).toBe(true)
    await act(async () => {})
    expect(screen.getByTestId('path').textContent).toBe('/home')
    expect(
      screen.getByRole('button', { name: '직접 설문하고 매칭하기' }),
    ).toBeInTheDocument()
  })

  it('goes back to the real flow from the notice', async () => {
    useUserTestEnv()
    startSession({ accessToken: 'a', refreshToken: 'r' })
    startParticipant(10, NEW_TESTER)
    setExperienceMode('demo')
    renderAt('/home')

    fireEvent.click(
      await screen.findByRole('button', { name: '직접 설문하고 매칭하기' }),
    )
    expect(isUserTestDemo()).toBe(false)
    await act(async () => {})
    expect(screen.getByTestId('path').textContent).toBe('/onboarding/priority')
  })
})
