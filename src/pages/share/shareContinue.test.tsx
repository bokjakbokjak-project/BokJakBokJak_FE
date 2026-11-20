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
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { markMyProfileStale } from '../../lib/profile/myProfile'
import {
  createShareUrl,
  type SharedProfile,
} from '../../lib/share/profileShare'
import {
  rememberShareReturn,
  takeShareReturn,
  type SharedReturnState,
} from '../../lib/share/shareReturn'
import {
  ANSWER_ROW_LABELS,
  answerRowLabels,
  wantedSection,
} from '../../test/answerSections'
import { profileData } from '../../test/surveyFixture'
import {
  QUESTION_COUNT,
  QUESTION_ROUTES,
  getQuestionStep,
} from '../question/questionData'

/**
 * `복작복작으로 이동` over the blurred rows of a shared profile, in server mode (requested
 * 2026-11-20): a saved survey unlocks the rows, no survey asks for one, and a signed-out visitor
 * signs in and comes back.
 */

const BASE = 'https://api.example.test'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
const ok = (data: unknown) =>
  json(200, { success: true, code: 'OK', message: '성공', data })
const fail = (status: number, code: string, message: string) =>
  json(status, { success: false, code, message, errors: {} })

const PROFILE: SharedProfile = {
  name: '복작이',
  department: '소프트웨어학부',
  priorities: ['sleep-habit', 'cleaning', 'smoking'],
  answers: Object.fromEntries(
    Array.from({ length: QUESTION_COUNT }, (_, index) => [
      index,
      getQuestionStep(index).question.options[0],
    ]),
  ),
}
const HASH = new URL(createShareUrl(PROFILE, 'https://example.com')).hash

let profileResponse: () => Response

function Path() {
  return <output data-testid="path">{useLocation().pathname}</output>
}
const path = () => screen.getByTestId('path').textContent

function renderShared(state?: SharedReturnState) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/share', hash: HASH, state }]}>
      <AppRoutes />
      <Path />
    </MemoryRouter>,
  )
}

async function pressContinue() {
  await act(async () => {
    fireEvent.click(
      within(wantedSection()).getByRole('button', {
        name: '복작복작으로 이동',
      }),
    )
  })
}

beforeEach(() => {
  profileResponse = () => ok(profileData())
  vi.stubEnv('VITE_API_MODE', 'server')
  vi.stubEnv('VITE_API_BASE_URL', BASE)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const route = url.slice(BASE.length)
      if (route === '/api/auth/refresh') {
        return ok({
          access_token: 'access-2',
          token_type: 'Bearer',
          expires_in: 1800,
          refresh_token: 'refresh-2',
          refresh_expires_in: 1209600,
        })
      }
      if (route === '/api/me/profile') return profileResponse()
      return fail(404, 'NOT_FOUND', 'not found')
    }),
  )
  clearTokens()
  markMyProfileStale()
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  clearTokens()
  sessionStorage.clear()
})

describe('shared profile, 복작복작으로 이동', () => {
  it('shows the blurred rows to a signed-in visitor with a saved survey', async () => {
    startSession({ accessToken: 'access-1', refreshToken: 'refresh-1' })
    renderShared()
    fireEvent.click(await screen.findByRole('button', { name: '닫기' }))
    expect(screen.getByTestId('shared-blurred')).toBeInTheDocument()

    await pressContinue()

    await waitFor(() =>
      expect(screen.queryByTestId('shared-blurred')).not.toBeInTheDocument(),
    )
    expect(answerRowLabels(wantedSection())).toEqual(ANSWER_ROW_LABELS)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks a signed-in visitor without a survey to take it, then opens the survey', async () => {
    profileResponse = () => fail(409, 'SURVEY_REQUIRED', '설문이 필요해요')
    startSession({ accessToken: 'access-1', refreshToken: 'refresh-1' })
    renderShared()
    fireEvent.click(await screen.findByRole('button', { name: '닫기' }))

    await pressContinue()

    const dialog = await screen.findByRole('dialog', {
      name: /설문조사를 해서\s*복작이님과의 매칭률을 확인해보세요/,
    })
    expect(screen.getByTestId('shared-blurred')).toBeInTheDocument()
    fireEvent.click(
      within(dialog).getByRole('button', { name: '설문조사 하러 가기' }),
    )
    expect(path()).toBe(QUESTION_ROUTES.survey)
  })

  it('sends a signed-out visitor to the login and keeps the link to come back to', async () => {
    renderShared()
    fireEvent.click(await screen.findByRole('button', { name: '닫기' }))

    await pressContinue()

    expect(path()).toBe(ONBOARDING_ROUTES.login)
    expect(takeShareReturn()).toBe(`/share${HASH}`)
    // Taken once.
    expect(takeShareReturn()).toBeNull()
  })

  it('goes on by itself after the login, and starts a new account from the onboarding', async () => {
    profileResponse = () => fail(409, 'SURVEY_REQUIRED', '설문이 필요해요')
    startSession({ accessToken: 'access-1', refreshToken: 'refresh-1' })
    renderShared({ continueShared: true, nextStep: 'ONBOARDING' })

    // No arrival popup: the survey question comes right away.
    const dialog = await screen.findByRole('dialog', {
      name: /설문조사를 해서\s*복작이님과의 매칭률을 확인해보세요/,
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: '설문조사 하러 가기' }),
    )
    expect(path()).toBe(ONBOARDING_ROUTES.school)
  })

  it('accepts only a share link as the way back', () => {
    rememberShareReturn('https://evil.example/share#x')
    expect(takeShareReturn()).toBeNull()
    rememberShareReturn('/home')
    expect(takeShareReturn()).toBeNull()
  })
})
