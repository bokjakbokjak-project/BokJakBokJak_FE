import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { apiRequest } from '../api/apiClient'
import { resetGoogleIdentityForTests } from './googleIdentity'
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
async function chooseGoogleAccount() {
  await waitFor(() => expect(google.renderButton).toHaveBeenCalled())
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
    // The Figma button's 61px row, with Google's 40px button at its top (1036:26154).
    expect(slot).toHaveClass('h-[61px]', 'items-start')
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
