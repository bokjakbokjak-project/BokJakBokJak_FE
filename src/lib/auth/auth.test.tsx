import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { apiRequest } from '../api/apiClient'
import { resetGoogleIdentityForTests } from './googleIdentity'
import { resetStartRouteForTests } from './startRoute'
import { clearTokens, getAccessToken, getRefreshToken } from './tokenStore'

const BASE = 'https://api.example.test'
const CLIENT_ID = 'test-client.apps.googleusercontent.com'
const STORAGE_KEY = 'bokjak-auth-refresh'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
const ok = (data: unknown) =>
  json(200, { success: true, code: 'OK', message: '성공', data })
const fail = (status: number, code: string, message = `${code} 메시지`) =>
  json(status, { success: false, code, message, errors: {} })

const tokens = (n: number) => ({
  access_token: `access-${n}`,
  token_type: 'Bearer',
  expires_in: 1800,
  refresh_token: `refresh-${n}`,
  refresh_expires_in: 1209600,
})
const loginData = (nextStep: string) => ({
  ...tokens(1),
  user_id: 42,
  university_id: 1,
  onboarding_completed: nextStep !== 'ONBOARDING',
  survey_completed: nextStep === 'HOME',
  next_step: nextStep,
})

type Call = { path: string; init: RequestInit }
let calls: Call[]
let fetchMock: ReturnType<typeof vi.fn>
const callsTo = (path: string) => calls.filter((call) => call.path === path)
const bodyOf = (call: Call) => JSON.parse(String(call.init.body))
const authOf = (call: Call) =>
  new Headers(call.init.headers).get('Authorization')

function serve(
  handler: (path: string, call: Call) => Response | Promise<Response>,
) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    const call = { path: url.slice(BASE.length), init }
    calls.push(call)
    return handler(call.path, call)
  })
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
function installGoogle() {
  window.google = { accounts: { id: google } }
}
/** Like a user: waits until Google's button can be pressed, then picks the account. */
async function chooseGoogleAccount() {
  await waitFor(() => expect(google.renderButton).toHaveBeenCalled())
  await waitFor(() =>
    expect(screen.getByTestId('google-signin-button')).not.toHaveAttribute(
      'inert',
    ),
  )
  await act(async () => {
    googleConfig?.callback({ credential: 'google-id-token' })
  })
}

function LocationProbe() {
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="path">{useLocation().pathname}</output>
      <button type="button" onClick={() => navigate('/')}>
        probe: open login
      </button>
      <button type="button" onClick={() => navigate('/guest')}>
        probe: open guest
      </button>
    </>
  )
}
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  )
}
const path = () => screen.getByTestId('path').textContent
const restoringStatus = () =>
  screen.queryByRole('status', { name: '로그인 상태를 확인하고 있어요' })
const loginButton = () =>
  screen.queryByRole('button', { name: 'Sign up with Google' })
/** The login screen in either mode (the server mode draws Google's own button instead). */
const loginScreen = () => screen.queryByText('상황으로 찾는 룸메이트')

function useServerMode() {
  vi.stubEnv('VITE_API_MODE', 'server')
  vi.stubEnv('VITE_API_BASE_URL', BASE)
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID)
}

beforeEach(() => {
  calls = []
  fetchMock = vi.fn(() => Promise.reject(new Error('unexpected request')))
  vi.stubGlobal('fetch', fetchMock)
  googleConfig = null
  vi.clearAllMocks()
  clearTokens()
  resetGoogleIdentityForTests()
  resetStartRouteForTests()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  delete window.google
  clearTokens()
  document.head
    .querySelectorAll('script[src*="accounts.google.com"]')
    .forEach((script) => script.remove())
})

describe('sample mode (no VITE_API_MODE)', () => {
  it('opens protected screens without a session and loads no Google script', () => {
    renderAt('/my')

    expect(path()).toBe('/my')
    expect(
      screen.getByRole('button', { name: '로그아웃 하기' }),
    ).toBeInTheDocument()
    expect(
      document.querySelector('script[src*="accounts.google.com"]'),
    ).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the logout row as the not-ready notice', () => {
    renderAt('/my')

    fireEvent.click(screen.getByRole('button', { name: '로그아웃 하기' }))

    expect(screen.getByText('아직 준비 중입니다.')).toBeInTheDocument()
    expect(path()).toBe('/my')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('server mode: access control', () => {
  beforeEach(() => {
    useServerMode()
    installGoogle()
  })

  it.each([
    '/home',
    '/my',
    '/my/edit-name',
    '/roommate/sujeong/profile',
    '/notifications',
    '/roommate',
    '/chat',
    '/onboarding/school',
    '/onboarding/priority',
    '/question',
    '/question/profile',
  ])('sends %s to the login screen without a session', (target) => {
    renderAt(target)

    expect(path()).toBe('/')
    expect(loginScreen()).toBeInTheDocument()
  })

  it('keeps the shared profile link public', () => {
    renderAt('/share')

    expect(path()).toBe('/share')
    expect(loginScreen()).not.toBeInTheDocument()
  })
})

describe('server mode: sign-in', () => {
  beforeEach(() => {
    useServerMode()
    installGoogle()
  })

  it('shows Google’s own button, visible, where the Figma button was', async () => {
    renderAt('/')

    await waitFor(() => expect(google.renderButton).toHaveBeenCalled())
    expect(google.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: CLIENT_ID, ux_mode: 'popup' }),
    )
    const slot = screen.getByTestId('google-signin-button')
    const [parent, options] = google.renderButton.mock.calls[0] as unknown as [
      HTMLElement,
      Record<string, unknown>,
    ]
    expect(parent).toBe(slot)
    expect(options).toEqual(
      expect.objectContaining({
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signup_with',
        shape: 'pill',
        logo_alignment: 'center',
        locale: 'en',
      }),
    )
    // Google ignores presses on a button it cannot see, so nothing may hide it.
    expect(slot.closest('[class*="opacity-0"]')).toBeNull()
    expect(slot).not.toHaveClass('pointer-events-none')
    // A row as tall as Google's 40px button, which the 체험하기 button below matches.
    expect(slot).toHaveClass('h-10', 'items-start')
    expect(screen.getByRole('button', { name: 'Google' })).toBeVisible()
    // The Figma button is not drawn over or under it, and One Tap is not used instead.
    expect(loginButton()).not.toBeInTheDocument()
    expect(google.prompt).not.toHaveBeenCalled()
  })

  it.each([
    ['ONBOARDING', '/onboarding/school'],
    ['SURVEY', '/question'],
    ['HOME', '/home'],
  ])(
    'sends the ID token and follows next_step %s',
    async (nextStep, target) => {
      serve(() => ok(loginData(nextStep)))
      renderAt('/')

      await chooseGoogleAccount()

      await waitFor(() => expect(path()).toBe(target))
      const [call] = callsTo('/api/auth/login')
      expect(bodyOf(call)).toEqual({ id_token: 'google-id-token' })
      expect(authOf(call)).toBeNull()
      expect(getAccessToken()).toBe('access-1')
      expect(sessionStorage.getItem(STORAGE_KEY)).toBe('refresh-1')
      expect(localStorage).toHaveLength(0)
    },
  )

  it('shows the server message and stays signed out when the school is not supported', async () => {
    serve(() =>
      fail(
        403,
        'UNSUPPORTED_SCHOOL_ACCOUNT',
        '지원하는 학교 Google 계정으로 로그인해주세요.',
      ),
    )
    renderAt('/')

    await chooseGoogleAccount()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '지원하는 학교 Google 계정으로 로그인해주세요.',
    )
    expect(path()).toBe('/')
    expect(getRefreshToken()).toBeNull()
  })

  it('saves nothing when the answer is missing next_step', async () => {
    serve(() => ok({ ...loginData('HOME'), next_step: undefined }))
    renderAt('/')

    await chooseGoogleAccount()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '서버 응답을 확인할 수 없어요',
    )
    expect(getRefreshToken()).toBeNull()
    expect(path()).toBe('/')
  })

  it('reports a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    renderAt('/')

    await chooseGoogleAccount()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '네트워크 연결을 확인하고 다시 시도해주세요.',
    )
  })

  it('explains when Google’s script cannot load', async () => {
    delete window.google
    renderAt('/')

    const script = document.head.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    )
    expect(script).not.toBeNull()
    act(() => {
      script!.dispatchEvent(new Event('error'))
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Google 로그인을 불러오지 못했어요.',
    )
  })

  it('explains a missing client ID instead of loading Google', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    renderAt('/')

    expect(screen.getByRole('alert')).toHaveTextContent(
      '로그인 설정을 확인할 수 없어요.',
    )
    expect(google.initialize).not.toHaveBeenCalled()
  })
})

describe('server mode: reload', () => {
  beforeEach(() => {
    useServerMode()
    installGoogle()
  })

  it('restores the session from the stored refresh token', async () => {
    sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
    serve(() => ok(tokens(1)))
    renderAt('/home')

    expect(path()).toBe('/home')
    expect(restoringStatus()).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /안녕하세요/ }),
      ).toBeInTheDocument(),
    )
    expect(bodyOf(callsTo('/api/auth/refresh')[0])).toEqual({
      refresh_token: 'refresh-0',
    })
    expect(callsTo('/api/auth/refresh')).toHaveLength(1)
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('refresh-1')
  })

  it('goes to the login screen when the stored token is refused', async () => {
    sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
    serve(() => fail(401, 'INVALID_REFRESH_TOKEN'))
    renderAt('/home')

    await waitFor(() => expect(path()).toBe('/'))
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('opens no protected screen when the server cannot be reached, but keeps the token', async () => {
    sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    renderAt('/home')

    await waitFor(() => expect(path()).toBe('/'))
    expect(screen.queryByRole('heading', { name: /안녕하세요/ })).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('refresh-0')
  })

  it('refreshes once under StrictMode', async () => {
    sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
    serve(() => ok(tokens(1)))
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/home']}>
          <AppRoutes />
          <LocationProbe />
        </MemoryRouter>
      </StrictMode>,
    )

    await waitFor(() => expect(restoringStatus()).toBeNull())
    expect(path()).toBe('/home')
    expect(callsTo('/api/auth/refresh')).toHaveLength(1)
  })
})

describe('server mode: switching accounts', () => {
  beforeEach(() => {
    useServerMode()
    installGoogle()
  })

  it('starts over when another account signs in from the login screen', async () => {
    serve(() => ok(loginData('ONBOARDING')))
    renderAt('/')
    await chooseGoogleAccount()
    await waitFor(() => expect(path()).toBe('/onboarding/school'))
    fireEvent.change(screen.getByLabelText('학과'), {
      target: { value: '소프트웨어학부' },
    })

    // Back to the login screen inside the app while still signed in, then another sign-in.
    fireEvent.click(screen.getByRole('button', { name: 'probe: open login' }))
    expect(path()).toBe('/')
    await chooseGoogleAccount()
    await waitFor(() => expect(path()).toBe('/onboarding/school'))

    expect(screen.getByLabelText('학과')).toHaveValue('')
  })

  it('keeps account B signed in when A’s logout finishes after B signed in', async () => {
    sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
    let finishLogout: () => void = () => {}
    serve((requestPath) => {
      if (requestPath === '/api/auth/refresh') return ok(tokens(1))
      if (requestPath === '/api/auth/login') {
        return ok({
          ...loginData('HOME'),
          access_token: 'access-b',
          refresh_token: 'refresh-b',
        })
      }
      // A server without the status API yet: the login answer's next_step decides.
      if (requestPath === '/api/me/status') return fail(404, 'NOT_FOUND')
      return new Promise<Response>((resolve) => {
        finishLogout = () => resolve(ok(null))
      })
    })
    renderAt('/my')
    await waitFor(() => expect(restoringStatus()).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: '로그아웃 하기' }))
    await waitFor(() => expect(callsTo('/api/auth/logout')).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: 'probe: open login' }))
    await chooseGoogleAccount()
    await waitFor(() => expect(path()).toBe('/home'))

    await act(async () => {
      finishLogout()
    })

    expect(path()).toBe('/home')
    expect(getAccessToken()).toBe('access-b')
    expect(getRefreshToken()).toBe('refresh-b')
  })
})

describe('server mode: session end', () => {
  beforeEach(() => {
    useServerMode()
    installGoogle()
  })

  async function signedInAt(target: string) {
    sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
    renderAt(target)
    await waitFor(() => expect(restoringStatus()).toBeNull())
  }

  it('logs out from the my page and returns to the login screen', async () => {
    serve((requestPath) =>
      requestPath === '/api/auth/refresh' ? ok(tokens(1)) : ok(null),
    )
    await signedInAt('/my')

    fireEvent.click(screen.getByRole('button', { name: '로그아웃 하기' }))

    await waitFor(() => expect(path()).toBe('/'))
    const [call] = callsTo('/api/auth/logout')
    expect(authOf(call)).toBe('Bearer access-1')
    expect(bodyOf(call)).toEqual({ refresh_token: 'refresh-1' })
    expect(getRefreshToken()).toBeNull()
    expect(getAccessToken()).toBeNull()
    expect(google.disableAutoSelect).toHaveBeenCalled()
  })

  it('still logs out when the logout request fails', async () => {
    serve((requestPath) =>
      requestPath === '/api/auth/refresh'
        ? ok(tokens(1))
        : fail(500, 'SERVER_ERROR'),
    )
    await signedInAt('/my')

    fireEvent.click(screen.getByRole('button', { name: '로그아웃 하기' }))

    await waitFor(() => expect(path()).toBe('/'))
    expect(getRefreshToken()).toBeNull()
  })

  it('returns to the login screen when a request finds the session expired', async () => {
    let refreshCount = 0
    serve((requestPath) => {
      if (requestPath === '/api/auth/refresh') {
        refreshCount += 1
        return refreshCount === 1
          ? ok(tokens(1))
          : fail(401, 'INVALID_REFRESH_TOKEN')
      }
      return fail(401, 'UNAUTHORIZED')
    })
    await signedInAt('/home')

    await act(async () => {
      await apiRequest('/api/me/profile').catch(() => undefined)
    })

    await waitFor(() => expect(path()).toBe('/'))
    expect(getRefreshToken()).toBeNull()
  })

  it('forgets what the previous user typed once the session ends', async () => {
    serve((requestPath) => {
      if (requestPath === '/api/auth/login') return ok(loginData('ONBOARDING'))
      if (requestPath === '/api/me/status') return fail(404, 'NOT_FOUND')
      if (requestPath === '/api/auth/refresh') {
        return fail(401, 'INVALID_REFRESH_TOKEN')
      }
      return fail(401, 'UNAUTHORIZED')
    })
    renderAt('/')
    await chooseGoogleAccount()
    await waitFor(() => expect(path()).toBe('/onboarding/school'))
    fireEvent.change(screen.getByLabelText('학과'), {
      target: { value: '소프트웨어학부' },
    })

    await act(async () => {
      await apiRequest('/api/me/profile').catch(() => undefined)
    })
    await waitFor(() => expect(path()).toBe('/'))

    await chooseGoogleAccount()
    await waitFor(() => expect(path()).toBe('/onboarding/school'))
    expect(screen.getByLabelText('학과')).toHaveValue('')
  })
})

describe('server mode: start screen from GET /api/me/status', () => {
  beforeEach(() => {
    useServerMode()
    installGoogle()
  })

  const status = (nextStep: string, extra: Record<string, unknown> = {}) => ({
    onboarding_completed: nextStep !== 'ONBOARDING',
    survey_completed: nextStep === 'HOME',
    survey_update_required: false,
    next_step: nextStep,
    matched: false,
    matching_id: null,
    ...extra,
  })

  it.each([
    ['ONBOARDING', '/onboarding/school'],
    ['SURVEY', '/question'],
    ['HOME', '/home'],
  ])(
    'opens %s from the first screen when the app starts with a session',
    async (nextStep, target) => {
      sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
      serve((requestPath) =>
        requestPath === '/api/auth/refresh'
          ? ok(tokens(1))
          : requestPath === '/api/me/status'
            ? ok(status(nextStep))
            : fail(404, 'NOT_FOUND'),
      )
      renderAt('/')

      await waitFor(() => expect(path()).toBe(target))
      const [call] = callsTo('/api/me/status')
      expect(authOf(call)).toBe('Bearer access-1')
      expect(callsTo('/api/me/status')).toHaveLength(1)
    },
  )

  it('sends a user who must answer the new questions to the survey', async () => {
    sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
    serve((requestPath) =>
      requestPath === '/api/auth/refresh'
        ? ok(tokens(1))
        : requestPath === '/api/me/status'
          ? ok(
              status('SURVEY', {
                onboarding_completed: true,
                survey_update_required: true,
              }),
            )
          : fail(404, 'NOT_FOUND'),
    )
    renderAt('/')

    await waitFor(() => expect(path()).toBe('/question'))
  })

  it('stays on the first screen when the server has no status API yet', async () => {
    sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
    serve((requestPath) =>
      requestPath === '/api/auth/refresh'
        ? ok(tokens(1))
        : fail(404, 'NOT_FOUND'),
    )
    renderAt('/')

    await waitFor(() => expect(callsTo('/api/me/status')).toHaveLength(1))
    await waitFor(() =>
      expect(screen.getByTestId('google-signin-button')).not.toHaveAttribute(
        'aria-busy',
      ),
    )
    expect(path()).toBe('/')
    expect(getRefreshToken()).toBe('refresh-1')
  })

  it('waits on the first screen while the status is read, so the button cannot be pressed', async () => {
    sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
    let answer: (response: Response) => void = () => {}
    serve((requestPath) =>
      requestPath === '/api/auth/refresh'
        ? ok(tokens(1))
        : new Promise<Response>((resolve) => {
            answer = resolve
          }),
    )
    renderAt('/')

    await waitFor(() => expect(callsTo('/api/me/status')).toHaveLength(1))
    const slot = screen.getByTestId('google-signin-button')
    expect(slot).toHaveAttribute('aria-busy', 'true')
    expect(slot).toHaveClass('pointer-events-none')

    await act(async () => {
      answer(ok(status('HOME')))
    })
    await waitFor(() => expect(path()).toBe('/home'))
  })

  it('follows the status, not the login answer, right after a sign-in', async () => {
    serve((requestPath) =>
      requestPath === '/api/auth/login'
        ? ok(loginData('SURVEY'))
        : requestPath === '/api/me/status'
          ? ok(status('HOME'))
          : fail(404, 'NOT_FOUND'),
    )
    renderAt('/')

    await chooseGoogleAccount()

    await waitFor(() => expect(path()).toBe('/home'))
    expect(authOf(callsTo('/api/me/status')[0])).toBe('Bearer access-1')
  })

  it('falls back to the login answer when the status cannot be read', async () => {
    serve((requestPath) =>
      requestPath === '/api/auth/login'
        ? ok(loginData('SURVEY'))
        : fail(500, 'INTERNAL_ERROR'),
    )
    renderAt('/')

    await chooseGoogleAccount()

    await waitFor(() => expect(path()).toBe('/question'))
    expect(callsTo('/api/me/status')).toHaveLength(1)
  })

  it('keeps the new session when a server without the status API answers 401', async () => {
    let refreshes = 0
    serve((requestPath) => {
      if (requestPath === '/api/auth/login') return ok(loginData('SURVEY'))
      if (requestPath === '/api/auth/refresh') {
        refreshes += 1
        return ok(tokens(refreshes + 1))
      }
      if (requestPath === '/api/me/status') return fail(401, 'UNAUTHORIZED')
      return fail(404, 'NOT_FOUND')
    })
    renderAt('/')

    await chooseGoogleAccount()

    // 401, a successful refresh, 401 again: only the status request fails.
    await waitFor(() => expect(path()).toBe('/question'))
    expect(callsTo('/api/me/status')).toHaveLength(2)
    expect(callsTo('/api/auth/refresh')).toHaveLength(1)
    expect(getRefreshToken()).toBe('refresh-2')
    expect(getAccessToken()).toBe('access-2')
  })

  it('still signs out when the refresh itself is refused during the status read', async () => {
    serve((requestPath) => {
      if (requestPath === '/api/auth/login') return ok(loginData('SURVEY'))
      if (requestPath === '/api/auth/refresh') {
        return fail(401, 'INVALID_REFRESH_TOKEN')
      }
      return fail(401, 'UNAUTHORIZED')
    })
    renderAt('/')

    await chooseGoogleAccount()

    await waitFor(() => expect(getRefreshToken()).toBeNull())
    expect(path()).toBe('/')
  })

  it('ignores a second Google credential while the status is read', async () => {
    let answer: (response: Response) => void = () => {}
    serve((requestPath) =>
      requestPath === '/api/auth/login'
        ? ok(loginData('HOME'))
        : new Promise<Response>((resolve) => {
            answer = resolve
          }),
    )
    renderAt('/')
    await chooseGoogleAccount()
    await waitFor(() => expect(callsTo('/api/me/status')).toHaveLength(1))
    expect(screen.getByTestId('google-signin-button')).toHaveAttribute('inert')

    await act(async () => {
      googleConfig?.callback({ credential: 'google-id-token' })
    })
    expect(callsTo('/api/auth/login')).toHaveLength(1)

    await act(async () => {
      answer(ok(status('HOME')))
    })
    await waitFor(() => expect(path()).toBe('/home'))
  })

  it('reads the status once under StrictMode', async () => {
    sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
    serve((requestPath) =>
      requestPath === '/api/auth/refresh'
        ? ok(tokens(1))
        : requestPath === '/api/me/status'
          ? ok(status('HOME'))
          : fail(404, 'NOT_FOUND'),
    )
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
          <LocationProbe />
        </MemoryRouter>
      </StrictMode>,
    )

    await waitFor(() => expect(path()).toBe('/home'))
    expect(callsTo('/api/me/status')).toHaveLength(1)
  })
})

describe('server mode: 체험하기 (POST /api/auth/guest-login)', () => {
  beforeEach(() => {
    useServerMode()
    installGoogle()
  })

  const guestLink = () =>
    screen.getByRole('link', { name: '지금 바로 체험하기 →' })
  const nameField = () => screen.getByLabelText('이름')
  const startButton = () =>
    screen.getByRole('button', { name: /체험 시작하기|시작하는 중/ })

  async function openGuest() {
    renderAt('/')
    await waitFor(() => expect(google.renderButton).toHaveBeenCalled())
    fireEvent.click(guestLink())
    await waitFor(() => expect(path()).toBe('/guest'))
  }

  it('sits under Google’s button with the same width and height', async () => {
    renderAt('/')
    await waitFor(() => expect(google.renderButton).toHaveBeenCalled())

    const slot = screen.getByTestId('google-signin-button')
    const link = guestLink()
    // Google's button is 40px (GIS `large`) and as wide as the row, up to 400px.
    expect(slot).toHaveClass('h-10', 'w-full')
    const [, options] = google.renderButton.mock.calls[0] as unknown as [
      HTMLElement,
      Record<string, unknown>,
    ]
    expect(options).toEqual(expect.objectContaining({ size: 'large' }))
    expect(link).toHaveClass('h-10', 'w-full', 'max-w-[400px]', 'min-w-[200px]')
    // Figma 2708:21189: the brown pill 10px under it.
    expect(link).toHaveClass('mt-[10px]', 'rounded-full', 'bg-brand-brown1')
    expect(link).toHaveClass('text-[18px]', 'font-semibold', 'text-white')
    expect(slot.nextElementSibling).toBe(link)
    expect(link).toHaveAttribute('href', '/guest')
  })

  it('starts a guest session with the name and follows the status to the survey', async () => {
    serve((requestPath) => {
      if (requestPath === '/api/auth/guest-login')
        return ok(loginData('SURVEY'))
      if (requestPath === '/api/me/status') {
        return ok({
          onboarding_completed: true,
          survey_completed: false,
          survey_update_required: false,
          next_step: 'SURVEY',
          matched: false,
          matching_id: null,
        })
      }
      return fail(404, 'NOT_FOUND')
    })
    await openGuest()

    expect(
      screen.getByRole('heading', { name: '체험하기' }),
    ).toBeInTheDocument()
    expect(startButton()).toBeDisabled()
    fireEvent.change(nameField(), { target: { value: '  홍길동  ' } })
    expect(startButton()).toBeEnabled()
    fireEvent.click(startButton())

    await waitFor(() => expect(path()).toBe('/question'))
    const [call] = callsTo('/api/auth/guest-login')
    expect(call.init.method).toBe('POST')
    expect(bodyOf(call)).toEqual({ nickname: '홍길동' })
    expect(authOf(call)).toBeNull()
    expect(getAccessToken()).toBe('access-1')
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('refresh-1')
    expect(callsTo('/api/auth/guest-login')).toHaveLength(1)
  })

  it('follows the login answer when the status cannot be read', async () => {
    serve((requestPath) =>
      requestPath === '/api/auth/guest-login'
        ? ok(loginData('SURVEY'))
        : fail(500, 'INTERNAL_ERROR'),
    )
    await openGuest()
    fireEvent.change(nameField(), { target: { value: '부스방문자' } })
    fireEvent.click(startButton())

    await waitFor(() => expect(path()).toBe('/question'))
  })

  it('says why a name is refused and stays signed out', async () => {
    serve(() =>
      json(400, {
        success: false,
        code: 'INVALID_NICKNAME',
        message: '닉네임은 1~20자로 입력해주세요.',
        errors: { nickname: 'INVALID_FORMAT' },
      }),
    )
    await openGuest()
    fireEvent.change(nameField(), { target: { value: '이름' } })
    fireEvent.click(startButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '줄바꿈이나 보이지 않는 문자 없이',
    )
    expect(path()).toBe('/guest')
    expect(getRefreshToken()).toBeNull()
    expect(startButton()).toBeEnabled()
  })

  it('says when the server has switched 체험하기 off', async () => {
    serve(() => fail(404, 'RESOURCE_NOT_FOUND'))
    await openGuest()
    fireEvent.change(nameField(), { target: { value: '심사위원' } })
    fireEvent.click(startButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '지금은 체험하기를 사용할 수 없어요.',
    )
    expect(getRefreshToken()).toBeNull()
  })

  it('checks the length before sending anything', async () => {
    await openGuest()
    fireEvent.change(nameField(), { target: { value: '가'.repeat(21) } })

    expect(screen.getByRole('alert')).toHaveTextContent(
      '이름은 1~20자로 입력해주세요.',
    )
    expect(startButton()).toBeDisabled()
    fireEvent.change(nameField(), { target: { value: '   ' } })
    expect(startButton()).toBeDisabled()
    expect(callsTo('/api/auth/guest-login')).toHaveLength(0)
  })

  it('says 체험하기 is unavailable on a server without it (401 for an unknown public path)', async () => {
    serve(() =>
      fail(401, 'UNAUTHORIZED', '로그인이 필요하거나 인증이 만료되었습니다.'),
    )
    await openGuest()
    fireEvent.change(nameField(), { target: { value: '심사위원' } })
    fireEvent.click(startButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '지금은 체험하기를 사용할 수 없어요.',
    )
    expect(getRefreshToken()).toBeNull()
  })

  it('starts no second account when the name screen is left and opened again mid sign-in', async () => {
    let answer: (response: Response) => void = () => {}
    serve((requestPath) =>
      requestPath === '/api/auth/guest-login'
        ? new Promise<Response>((resolve) => {
            answer = resolve
          })
        : fail(404, 'NOT_FOUND'),
    )
    await openGuest()
    fireEvent.change(nameField(), { target: { value: '첫번째' } })
    fireEvent.click(startButton())
    await waitFor(() =>
      expect(callsTo('/api/auth/guest-login')).toHaveLength(1),
    )

    // Back to the login screen and into 체험하기 again while the first request is out.
    fireEvent.click(screen.getByRole('button', { name: '뒤로' }))
    await waitFor(() => expect(path()).toBe('/'))
    expect(guestLink()).toHaveAttribute('inert')
    fireEvent.click(screen.getByRole('button', { name: 'probe: open guest' }))
    await waitFor(() => expect(path()).toBe('/guest'))
    fireEvent.change(nameField(), { target: { value: '두번째' } })
    expect(startButton()).toBeDisabled()
    fireEvent.submit(nameField().closest('form')!)
    expect(callsTo('/api/auth/guest-login')).toHaveLength(1)

    await act(async () => {
      answer(ok(loginData('SURVEY')))
    })
    await waitFor(() => expect(path()).toBe('/question'))
    expect(callsTo('/api/auth/guest-login')).toHaveLength(1)
  })

  it('keeps 체험하기 closed while a Google sign-in is out', async () => {
    let answer: (response: Response) => void = () => {}
    serve((requestPath) =>
      requestPath === '/api/auth/login'
        ? new Promise<Response>((resolve) => {
            answer = resolve
          })
        : fail(404, 'NOT_FOUND'),
    )
    renderAt('/')
    await chooseGoogleAccount()
    await waitFor(() => expect(callsTo('/api/auth/login')).toHaveLength(1))

    expect(guestLink()).toHaveAttribute('inert')
    expect(guestLink()).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'probe: open guest' }))
    await waitFor(() => expect(path()).toBe('/guest'))
    fireEvent.change(nameField(), { target: { value: '부스' } })
    expect(startButton()).toBeDisabled()

    await act(async () => {
      answer(ok(loginData('HOME')))
    })
    expect(callsTo('/api/auth/guest-login')).toHaveLength(0)
  })

  it('returns to the login screen with the back button', async () => {
    await openGuest()
    fireEvent.click(screen.getByRole('button', { name: '뒤로' }))
    expect(path()).toBe('/')
  })

  it('does not keep a signed-in user on the name screen', async () => {
    sessionStorage.setItem(STORAGE_KEY, 'refresh-0')
    serve((requestPath) => {
      if (requestPath === '/api/auth/refresh') return ok(tokens(1))
      if (requestPath === '/api/me/status') {
        return ok({
          onboarding_completed: true,
          survey_completed: true,
          survey_update_required: false,
          next_step: 'HOME',
          matched: false,
          matching_id: null,
        })
      }
      return fail(404, 'NOT_FOUND')
    })
    renderAt('/guest')

    await waitFor(() => expect(path()).toBe('/home'))
    expect(callsTo('/api/auth/guest-login')).toHaveLength(0)
  })
})

describe('sample mode: no 체험하기', () => {
  it('shows no 체험하기 button and sends /guest back to the login screen', () => {
    renderAt('/')
    expect(
      screen.queryByRole('link', { name: '지금 바로 체험하기 →' }),
    ).not.toBeInTheDocument()

    cleanup()
    renderAt('/guest')
    expect(path()).toBe('/')
  })
})
