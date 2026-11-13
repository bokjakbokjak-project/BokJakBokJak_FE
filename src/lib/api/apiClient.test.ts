import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logout } from '../auth/authApi'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
  startSession,
} from '../auth/tokenStore'
import {
  REQUEST_TIMEOUT_MS,
  apiRequest,
  onSessionEnd,
  refreshSession,
} from './apiClient'
import { ApiError } from './apiError'
import { getApiBaseUrl } from './config'

const BASE = 'https://api.example.test'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
const ok = (data: unknown) =>
  json(200, { success: true, code: 'OK', message: '성공', data })
const fail = (status: number, code: string, errors = {}) =>
  json(status, { success: false, code, message: `${code} 메시지`, errors })

const tokenData = (n: number) => ({
  access_token: `access-${n}`,
  token_type: 'Bearer',
  expires_in: 1800,
  refresh_token: `refresh-${n}`,
  refresh_expires_in: 1209600,
})

type Call = { url: string; init: RequestInit }
let calls: Call[]
let fetchMock: ReturnType<typeof vi.fn>

const callsTo = (path: string) =>
  calls.filter(({ url }) => url === `${BASE}${path}`)
const headerOf = (call: Call, name: string) =>
  new Headers(call.init.headers).get(name)
const bodyOf = (call: Call) => JSON.parse(String(call.init.body))

/** Routes each request to `handler`, recording it first. */
function serve(
  handler: (path: string, call: Call) => Response | Promise<Response>,
) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    const call = { url, init }
    calls.push(call)
    return handler(url.slice(BASE.length), call)
  })
}

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', BASE)
  calls = []
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  clearTokens()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  clearTokens()
})

describe('config', () => {
  it('accepts https and a local http server, and refuses anything else', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/')
    expect(getApiBaseUrl()).toBe('https://api.example.test')
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
    expect(getApiBaseUrl()).toBe('http://localhost:8080')
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.example.test')
    expect(getApiBaseUrl()).toBeNull()
    vi.stubEnv('VITE_API_BASE_URL', 'not a url')
    expect(getApiBaseUrl()).toBeNull()
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(getApiBaseUrl()).toBeNull()
  })

  it('sends nothing without a usable address', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.example.test')

    await expect(apiRequest('/api/x', { auth: false })).rejects.toMatchObject({
      kind: 'config',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('apiRequest', () => {
  it('returns data and sends the access token and a JSON body', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    serve(() => ok({ value: 1 }))

    await expect(
      apiRequest('/api/me/profile', {
        method: 'PATCH',
        body: { nickname: 'a' },
      }),
    ).resolves.toEqual({ value: 1 })

    const [call] = calls
    expect(call.url).toBe(`${BASE}/api/me/profile`)
    expect(call.init.method).toBe('PATCH')
    expect(headerOf(call, 'Authorization')).toBe('Bearer access-0')
    expect(headerOf(call, 'Content-Type')).toBe('application/json')
    expect(bodyOf(call)).toEqual({ nickname: 'a' })
    expect(call.init.credentials).toBe('omit')
  })

  it('sends no token for a public request', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    serve(() => ok(null))

    await apiRequest('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: {},
    })

    expect(headerOf(calls[0], 'Authorization')).toBeNull()
  })

  it('turns the common error body into an ApiError', async () => {
    serve(() =>
      fail(400, 'INVALID_INPUT', {
        id_token: 'Google ID 토큰을 입력해주세요.',
      }),
    )

    const error = await apiRequest('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: {},
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      kind: 'http',
      status: 400,
      code: 'INVALID_INPUT',
      message: 'INVALID_INPUT 메시지',
      fieldErrors: { id_token: 'Google ID 토큰을 입력해주세요.' },
    })
  })

  it('handles an error page that is not JSON', async () => {
    serve(() => new Response('<html>Bad Gateway</html>', { status: 502 }))

    await expect(apiRequest('/api/x', { auth: false })).rejects.toMatchObject({
      kind: 'http',
      status: 502,
      code: 'HTTP_502',
      message: '서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
    })
  })

  it('refuses a success status without the agreed body', async () => {
    serve(() => json(200, { hello: 'world' }))

    await expect(apiRequest('/api/x', { auth: false })).rejects.toMatchObject({
      kind: 'invalid-response',
    })
  })

  it('reports a request that got no answer as a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(apiRequest('/api/x', { auth: false })).rejects.toMatchObject({
      kind: 'network',
      code: 'NETWORK_ERROR',
    })
  })

  it('gives up after the time limit', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          )
        }),
    )

    const request = apiRequest('/api/x', { auth: false })
    const assertion = expect(request).rejects.toMatchObject({ kind: 'timeout' })
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    await assertion
  })

  it('passes a cancel from the caller through', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      apiRequest('/api/x', { auth: false, signal: controller.signal }),
    ).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('refresh on 401', () => {
  it('refreshes once, saves both new tokens, and retries the request', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    serve((path, call) => {
      if (path === '/api/auth/refresh') return ok(tokenData(1))
      return headerOf(call, 'Authorization') === 'Bearer access-1'
        ? ok({ done: true })
        : fail(401, 'UNAUTHORIZED')
    })

    await expect(apiRequest('/api/me/survey')).resolves.toEqual({ done: true })

    const [refresh] = callsTo('/api/auth/refresh')
    expect(callsTo('/api/auth/refresh')).toHaveLength(1)
    expect(bodyOf(refresh)).toEqual({ refresh_token: 'refresh-0' })
    expect(headerOf(refresh, 'Authorization')).toBeNull()
    expect(getAccessToken()).toBe('access-1')
    expect(getRefreshToken()).toBe('refresh-1')
  })

  it('shares one refresh between requests that fail at the same time', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    serve(async (path, call) => {
      if (path === '/api/auth/refresh') {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return ok(tokenData(1))
      }
      return headerOf(call, 'Authorization') === 'Bearer access-1'
        ? ok(path)
        : fail(401, 'UNAUTHORIZED')
    })

    const results = await Promise.all([
      apiRequest('/api/a'),
      apiRequest('/api/b'),
      apiRequest('/api/c'),
    ])

    expect(results).toEqual(['/api/a', '/api/b', '/api/c'])
    expect(callsTo('/api/auth/refresh')).toHaveLength(1)
  })

  it('retries without refreshing when another request already refreshed', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    serve((path, call) => {
      if (path === '/api/auth/refresh') return ok(tokenData(9))
      if (headerOf(call, 'Authorization') === 'Bearer access-1') return ok('ok')
      // The token changes while this request is out, as if another one refreshed.
      saveTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' })
      return fail(401, 'UNAUTHORIZED')
    })

    await expect(apiRequest('/api/a')).resolves.toBe('ok')
    expect(callsTo('/api/auth/refresh')).toHaveLength(0)
  })

  it('ends the session when the refresh token is refused', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    const ended = vi.fn()
    const stop = onSessionEnd(ended)
    serve((path) =>
      path === '/api/auth/refresh'
        ? fail(401, 'INVALID_REFRESH_TOKEN')
        : fail(401, 'UNAUTHORIZED'),
    )

    await expect(apiRequest('/api/a')).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    })
    expect(ended).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    stop()
  })

  it('keeps the session when the refresh fails for a network reason', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    const ended = vi.fn()
    const stop = onSessionEnd(ended)
    serve((path) => {
      if (path === '/api/auth/refresh') throw new TypeError('Failed to fetch')
      return fail(401, 'UNAUTHORIZED')
    })

    await expect(apiRequest('/api/a')).rejects.toMatchObject({
      kind: 'network',
    })
    expect(ended).not.toHaveBeenCalled()
    expect(getRefreshToken()).toBe('refresh-0')
    stop()
  })

  it('does not loop when the new token is refused as well', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    const ended = vi.fn()
    const stop = onSessionEnd(ended)
    serve((path) =>
      path === '/api/auth/refresh'
        ? ok(tokenData(1))
        : fail(401, 'UNAUTHORIZED'),
    )

    await expect(apiRequest('/api/a')).rejects.toMatchObject({ status: 401 })
    expect(callsTo('/api/auth/refresh')).toHaveLength(1)
    expect(callsTo('/api/a')).toHaveLength(2)
    expect(ended).toHaveBeenCalledTimes(1)
    expect(getRefreshToken()).toBeNull()
    stop()
  })

  it('does not refresh for other errors', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    serve(() => fail(403, 'ACCOUNT_UNAVAILABLE'))

    await expect(apiRequest('/api/a')).rejects.toMatchObject({ status: 403 })
    expect(callsTo('/api/auth/refresh')).toHaveLength(0)
  })

  it('refreshes first when only the refresh token is left after a reload', async () => {
    saveTokens({ accessToken: 'unused', refreshToken: 'refresh-0' })
    // A reload drops the in-memory access token; the stored refresh token stays.
    const stored = getRefreshToken()
    clearTokens()
    sessionStorage.setItem('bokjak-auth-refresh', stored!)
    serve((path) =>
      path === '/api/auth/refresh' ? ok(tokenData(1)) : ok('ok'),
    )

    await expect(apiRequest('/api/a')).resolves.toBe('ok')
    expect(calls.map(({ url }) => url.slice(BASE.length))).toEqual([
      '/api/auth/refresh',
      '/api/a',
    ])
    expect(headerOf(calls[1], 'Authorization')).toBe('Bearer access-1')
  })

  it('sends nothing and ends the session when there is no session at all', async () => {
    const ended = vi.fn()
    const stop = onSessionEnd(ended)

    await expect(apiRequest('/api/a')).rejects.toMatchObject({
      code: 'NO_SESSION',
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(ended).toHaveBeenCalledTimes(1)
    stop()
  })

  it('does not bring a session back when it ended during the refresh', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    serve(async () => {
      clearTokens() // Signed out while the refresh was out.
      return ok(tokenData(1))
    })

    await expect(refreshSession()).rejects.toMatchObject({
      code: 'SESSION_CHANGED',
    })

    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('refuses a refresh answer without tokens', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    serve(() => ok({ access_token: 'only-access' }))

    await expect(refreshSession()).rejects.toMatchObject({
      kind: 'invalid-response',
    })
    expect(getRefreshToken()).toBe('refresh-0')
  })
})

describe('across sessions', () => {
  it('a refused refresh of an old session leaves a newer sign-in alone', async () => {
    saveTokens({ accessToken: 'access-a', refreshToken: 'refresh-a' })
    const ended = vi.fn()
    const stop = onSessionEnd(ended)
    serve(async () => {
      // Account B signs in while A's refresh is out, then A's token is refused.
      startSession({ accessToken: 'access-b', refreshToken: 'refresh-b' })
      return fail(401, 'INVALID_REFRESH_TOKEN')
    })

    await expect(refreshSession()).rejects.toMatchObject({ status: 401 })

    expect(getAccessToken()).toBe('access-b')
    expect(getRefreshToken()).toBe('refresh-b')
    expect(ended).not.toHaveBeenCalled()
    stop()
  })

  it('never retries an old request with the next session’s token', async () => {
    saveTokens({ accessToken: 'access-a', refreshToken: 'refresh-a' })
    serve((path) => {
      if (path === '/api/auth/refresh') return ok(tokenData(1))
      // B signs in while A's request is out; A's request then comes back 401.
      startSession({ accessToken: 'access-b', refreshToken: 'refresh-b' })
      return fail(401, 'UNAUTHORIZED')
    })

    await expect(
      apiRequest('/api/me/survey', { method: 'PUT', body: { a: 1 } }),
    ).rejects.toMatchObject({ code: 'SESSION_CHANGED' })

    expect(callsTo('/api/me/survey')).toHaveLength(1)
    expect(callsTo('/api/auth/refresh')).toHaveLength(0)
    expect(getAccessToken()).toBe('access-b')
  })

  it('does not join a refresh that belongs to the previous session', async () => {
    saveTokens({ accessToken: 'access-a', refreshToken: 'refresh-a' })
    let release: () => void = () => {}
    serve(async (_path, call) => {
      const sent = bodyOf(call).refresh_token
      if (sent === 'refresh-a') {
        await new Promise<void>((resolve) => {
          release = resolve
        })
        return fail(401, 'INVALID_REFRESH_TOKEN')
      }
      return ok(tokenData(2))
    })

    const oldRefresh = refreshSession().catch((error: unknown) => error)
    startSession({ accessToken: 'access-b', refreshToken: 'refresh-b' })
    const newRefresh = refreshSession()
    release()

    await expect(newRefresh).resolves.toBeUndefined()
    await oldRefresh
    expect(callsTo('/api/auth/refresh').map(bodyOf)).toEqual([
      { refresh_token: 'refresh-a' },
      { refresh_token: 'refresh-b' },
    ])
    expect(getRefreshToken()).toBe('refresh-2')
  })
})

describe('tokens', () => {
  it('keeps the access token out of storage and the refresh token in this tab only', () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })

    expect(sessionStorage.getItem('bokjak-auth-refresh')).toBe('refresh-0')
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('access-0')
    expect(localStorage).toHaveLength(0)
  })

  it('works in memory when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    expect(getRefreshToken()).toBe('refresh-0')
    vi.restoreAllMocks()
  })
})

describe('logout', () => {
  it('sends the current tokens and clears them', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    serve(() => ok(null))

    await logout()

    const [call] = callsTo('/api/auth/logout')
    expect(headerOf(call, 'Authorization')).toBe('Bearer access-0')
    expect(bodyOf(call)).toEqual({ refresh_token: 'refresh-0' })
    expect(getRefreshToken()).toBeNull()
  })

  it('sends the rotated refresh token when it had to refresh first', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    serve((path, call) => {
      if (path === '/api/auth/refresh') return ok(tokenData(1))
      return headerOf(call, 'Authorization') === 'Bearer access-1'
        ? ok(null)
        : fail(401, 'UNAUTHORIZED')
    })

    await logout()

    const logoutCalls = callsTo('/api/auth/logout')
    expect(bodyOf(logoutCalls[1])).toEqual({ refresh_token: 'refresh-1' })
    expect(getRefreshToken()).toBeNull()
  })

  it('signs out locally even when the server fails', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    serve(() => fail(500, 'SERVER_ERROR'))

    await expect(logout()).resolves.toBe(true)
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('leaves a newer sign-in alone when it finishes late', async () => {
    saveTokens({ accessToken: 'access-a', refreshToken: 'refresh-a' })
    serve(async () => {
      // B signs in while A's logout is out.
      startSession({ accessToken: 'access-b', refreshToken: 'refresh-b' })
      return ok(null)
    })

    await expect(logout()).resolves.toBe(false)
    expect(getAccessToken()).toBe('access-b')
    expect(getRefreshToken()).toBe('refresh-b')
  })

  it('reports the session as ended when a refused refresh ended it first', async () => {
    saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' })
    serve((path) =>
      path === '/api/auth/refresh'
        ? fail(401, 'INVALID_REFRESH_TOKEN')
        : fail(401, 'UNAUTHORIZED'),
    )

    await expect(logout()).resolves.toBe(true)
    expect(getRefreshToken()).toBeNull()
  })
})
