import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { takeShareReturn } from '../../lib/share/shareReturn'
import { createShareUrl } from '../../lib/share/profileShare'
import SharedProfilePage from './SharedProfilePage'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  status: vi.fn(),
  auth: vi.fn(),
  route: vi.fn(),
}))
vi.mock('../../lib/api/apiClient', () => ({ apiRequest: mocks.request }))
vi.mock('../../lib/auth/statusApi', () => ({ fetchMyStatus: mocks.status }))
vi.mock('../../lib/auth/authState', () => ({ useAuth: mocks.auth }))
vi.mock('../../lib/auth/startRoute', () => ({ resolveStartRoute: mocks.route }))

function show(userId?: number) {
  const url = createShareUrl(
    { name: 'Friend', department: 'CS', priorities: [], answers: {}, userId },
    'https://example.com',
  )
  render(
    <MemoryRouter initialEntries={[new URL(url).pathname + new URL(url).hash]}>
      <Routes>
        <Route path="/share" element={<SharedProfilePage />} />
        <Route path="/" element={<p>Login destination</p>} />
        <Route path="/question" element={<p>Survey destination</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('shared match score', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    mocks.auth.mockReturnValue({ status: 'authenticated' })
    mocks.status.mockResolvedValue({ nextStep: 'HOME', surveyCompleted: true })
  })
  it('shows the score without a prompt for a completed user', async () => {
    mocks.request.mockResolvedValue({ target_user_id: 42, match_score: 87 })
    show(42)
    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith('/api/share/42/match-score', {
        retried401: 'fail',
      }),
    )
    expect(await screen.findByText('87')).toBeInTheDocument()
    expect(screen.queryByTestId('shared-blurred')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('prompts an incomplete user without calling the score API', async () => {
    mocks.status.mockResolvedValue({ nextStep: 'SURVEY' })
    show(42)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('shared-blurred')).toBeInTheDocument()
    expect(mocks.request).not.toHaveBeenCalled()
  })
  it('unlocks an old link after survey completion without requesting a score', async () => {
    show()
    await waitFor(() =>
      expect(screen.queryByTestId('shared-blurred')).not.toBeInTheDocument(),
    )
    expect(mocks.request).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('unlocks the profile even when the score request fails', async () => {
    mocks.request.mockRejectedValue(new Error('network'))
    show(42)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByTestId('shared-blurred')).not.toBeInTheDocument()
  })
  it('keeps the share link when a signed-out visitor starts login', async () => {
    mocks.auth.mockReturnValue({ status: 'unauthenticated' })
    show(42)
    expect(screen.getByTestId('shared-blurred')).toBeInTheDocument()
    fireEvent.click(
      within(screen.getByRole('dialog')).getAllByRole('button')[1],
    )
    expect(await screen.findByText('Login destination')).toBeInTheDocument()
    expect(takeShareReturn()).toMatch(/^\/share#/)
  })
  it('sends a signed-in incomplete visitor to the survey and keeps the link', async () => {
    mocks.status.mockResolvedValue({ nextStep: 'SURVEY' })
    mocks.route.mockResolvedValue('/question')
    show(42)
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getAllByRole('button')[1])
    expect(await screen.findByText('Survey destination')).toBeInTheDocument()
    expect(takeShareReturn()).toMatch(/^\/share#/)
  })
})
