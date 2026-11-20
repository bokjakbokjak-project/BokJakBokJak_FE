import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  rememberShareReturn,
  takeShareReturn,
} from '../../lib/share/shareReturn'
import { createShareUrl } from '../../lib/share/profileShare'
import { ApiError } from '../../lib/api/apiError'
import SharedProfilePage from './SharedProfilePage'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  status: vi.fn(),
  auth: vi.fn(),
  myProfile: vi.fn(),
}))
vi.mock('../../lib/api/apiClient', () => ({ apiRequest: mocks.request }))
vi.mock('../../lib/auth/statusApi', () => ({ fetchMyStatus: mocks.status }))
vi.mock('../../lib/auth/authState', () => ({ useAuth: mocks.auth }))
vi.mock('../../lib/profile/profileApi', () => ({
  fetchMyProfile: mocks.myProfile,
}))

/**
 * `복작복작으로 이동` on a shared profile for every kind of visitor (requested 2026-11-20): who
 * may see the blurred rows, where the button leads, and that the link is kept to come back to.
 */

function Destination({ label }: { label: string }) {
  const { state } = useLocation()
  return (
    <p>
      {label}
      {(state as { from?: string } | null)?.from === 'my' ? ' (from my)' : ''}
    </p>
  )
}

function show(userId?: number) {
  const url = new URL(
    createShareUrl(
      {
        name: 'Friend',
        department: 'CS',
        priorities: [],
        answers: {},
        userId,
      },
      'https://example.com',
    ),
  )
  render(
    <MemoryRouter initialEntries={[url.pathname + url.hash]}>
      <Routes>
        <Route path="/share" element={<SharedProfilePage />} />
        <Route path="/" element={<Destination label="Login" />} />
        <Route path="/question" element={<Destination label="Survey" />} />
        <Route
          path="/onboarding/school"
          element={<Destination label="Onboarding" />}
        />
        <Route path="/home" element={<Destination label="Home" />} />
        <Route
          path="/question/profile"
          element={<Destination label="My profile" />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

const blurred = () => screen.queryByTestId('shared-blurred')
const lockButton = (name: string | RegExp) =>
  screen.getByRole('button', { name })

describe('shared profile for each visitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    mocks.auth.mockReturnValue({ status: 'authenticated' })
    mocks.status.mockResolvedValue({ nextStep: 'HOME', surveyCompleted: true })
    mocks.myProfile.mockResolvedValue({ userId: 7 })
    mocks.request.mockResolvedValue({ target_user_id: 42, match_score: 87 })
  })

  it('opens every row with the score for a signed-in user with a survey', async () => {
    show(42)
    expect(await screen.findByText('87')).toBeInTheDocument()
    expect(mocks.request).toHaveBeenCalledWith('/api/share/42/match-score', {
      retried401: 'fail',
    })
    expect(blurred()).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '복작복작으로 이동' }),
    ).not.toBeInTheDocument()
  })

  it('still opens the rows when the score cannot be read', async () => {
    mocks.request.mockRejectedValue(new Error('down'))
    show(42)
    expect(
      await screen.findByText(/매칭률을 불러올 수 없어요/),
    ).toBeInTheDocument()
    expect(blurred()).not.toBeInTheDocument()
  })

  it('opens the rows of an old link without a sharer id, without the score', async () => {
    show()
    await waitFor(() => expect(blurred()).not.toBeInTheDocument())
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('shows the sharer their own profile where the my page shows it', async () => {
    mocks.myProfile.mockResolvedValue({ userId: 42 })
    show(42)
    expect(await screen.findByText('My profile (from my)')).toBeInTheDocument()
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('keeps a signed-out visitor’s link through the login', async () => {
    mocks.auth.mockReturnValue({ status: 'unauthenticated' })
    show(42)
    expect(blurred()).toBeInTheDocument()
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: '닫기' }),
    )
    fireEvent.click(lockButton('복작복작으로 이동'))
    expect(await screen.findByText('Login')).toBeInTheDocument()
    expect(takeShareReturn()).toMatch(/^\/share#/)
    expect(mocks.status).not.toHaveBeenCalled()
  })

  it('sends a signed-in user without a survey to it, keeping the link', async () => {
    mocks.status.mockResolvedValue({
      nextStep: 'SURVEY',
      surveyCompleted: false,
    })
    show(42)
    const dialog = await screen.findByRole('dialog')
    expect(blurred()).toBeInTheDocument()
    fireEvent.click(
      within(dialog).getByRole('button', { name: '설문조사 하러 가기' }),
    )
    expect(await screen.findByText('Survey')).toBeInTheDocument()
    expect(takeShareReturn()).toMatch(/^\/share#/)
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('keeps the rows closed when the status says HOME but the survey is not finished', async () => {
    mocks.status.mockResolvedValue({ nextStep: 'HOME', surveyCompleted: false })
    show(42)
    const dialog = await screen.findByRole('dialog')
    expect(blurred()).toBeInTheDocument()
    fireEvent.click(
      within(dialog).getByRole('button', { name: '설문조사 하러 가기' }),
    )
    expect(await screen.findByText('Survey')).toBeInTheDocument()
  })

  it('starts a new account at the onboarding', async () => {
    mocks.status.mockResolvedValue({
      nextStep: 'ONBOARDING',
      surveyCompleted: false,
    })
    show(42)
    await screen.findByRole('dialog')
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: '닫기' }),
    )
    fireEvent.click(lockButton('설문조사 하러 가기'))
    expect(await screen.findByText('Onboarding')).toBeInTheDocument()
  })

  it('treats a profile that answers 409 SURVEY_REQUIRED as no survey', async () => {
    mocks.myProfile.mockRejectedValue(
      new ApiError({
        kind: 'http',
        status: 409,
        code: 'SURVEY_REQUIRED',
        message: 'survey',
      }),
    )
    show(42)
    await screen.findByRole('dialog')
    expect(blurred()).toBeInTheDocument()
  })

  it('keeps the rows closed and retries when the status cannot be read', async () => {
    mocks.status.mockRejectedValueOnce(new Error('down'))
    show(42)
    const retry = await screen.findByRole('button', { name: '다시 시도' })
    expect(blurred()).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(retry)
    })
    await waitFor(() => expect(blurred()).not.toBeInTheDocument())
  })

  it('forgets a kept link when the visitor leaves for the home on purpose', async () => {
    mocks.auth.mockReturnValue({ status: 'unauthenticated' })
    rememberShareReturn('#older')
    show(42)
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: '닫기' }),
    )
    fireEvent.click(screen.getByRole('button', { name: '홈화면으로 가기' }))
    expect(await screen.findByText('Login')).toBeInTheDocument()
    expect(takeShareReturn()).toBeNull()
  })

  it('waits for a restored session before offering anything', () => {
    mocks.auth.mockReturnValue({ status: 'restoring' })
    show(42)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(lockButton('확인하는 중…')).toBeDisabled()
  })
})
