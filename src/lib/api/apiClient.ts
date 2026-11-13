import { parseTokenResponse } from '../auth/authDto'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getSessionGeneration,
  saveTokens,
} from '../auth/tokenStore'
import { ApiError, invalidResponse } from './apiError'
import { getApiBaseUrl } from './config'

export const REQUEST_TIMEOUT_MS = 15_000
const REFRESH_PATH = '/api/auth/refresh'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type RequestOptions = {
  method?: Method
  /**
   * JSON body. A function is called again before a retry, so a body that carries a token (the
   * logout request) sends the token that is current after a refresh.
   */
  body?: unknown
  /** Sends the access token and refreshes it once on 401. Defaults to true. */
  auth?: boolean
  signal?: AbortSignal
}

// ---------------------------------------------------------------------------------------------
// Session ended

type SessionEndListener = () => void
const sessionEndListeners = new Set<SessionEndListener>()

/** Called when the stored session turns out to be invalid and has been cleared. */
export function onSessionEnd(listener: SessionEndListener) {
  sessionEndListeners.add(listener)
  return () => {
    sessionEndListeners.delete(listener)
  }
}

/** Ends the session that `generation` belongs to, unless a newer one has started since. */
function endSessionOf(generation: number) {
  if (getSessionGeneration() !== generation) return
  clearTokens()
  for (const listener of [...sessionEndListeners]) listener()
}

// ---------------------------------------------------------------------------------------------
// One HTTP exchange

type Envelope = {
  success?: unknown
  code?: unknown
  message?: unknown
  data?: unknown
  errors?: unknown
}

async function readEnvelope(response: Response): Promise<Envelope | null> {
  try {
    const body: unknown = await response.json()
    return typeof body === 'object' && body !== null ? (body as Envelope) : null
  } catch {
    return null
  }
}

function readFieldErrors(errors: unknown): Record<string, string> {
  if (typeof errors !== 'object' || errors === null) return {}
  return Object.fromEntries(
    Object.entries(errors).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

function defaultMessage(status: number) {
  if (status >= 500) return '서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요.'
  if (status === 401) return '로그인이 필요하거나 인증이 만료되었습니다.'
  return '요청을 처리하지 못했어요.'
}

function httpError(status: number, envelope: Envelope | null) {
  return new ApiError({
    kind: 'http',
    status,
    code:
      typeof envelope?.code === 'string' && envelope.code
        ? envelope.code
        : `HTTP_${status}`,
    message:
      typeof envelope?.message === 'string' && envelope.message
        ? envelope.message
        : defaultMessage(status),
    fieldErrors: readFieldErrors(envelope?.errors),
  })
}

type SendInit = {
  method: Method
  body?: unknown
  accessToken?: string | null
  signal?: AbortSignal
}

/** Sends one request and returns the envelope's `data`. Never refreshes or retries. */
async function send(path: string, init: SendInit): Promise<unknown> {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    throw new ApiError({
      kind: 'config',
      status: null,
      code: 'API_NOT_CONFIGURED',
      message: '서버 주소가 설정되지 않았어요.',
    })
  }
  init.signal?.throwIfAborted()

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)
  const forwardAbort = () => controller.abort(init.signal?.reason)
  init.signal?.addEventListener('abort', forwardAbort)

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'
  if (init.accessToken) headers.Authorization = `Bearer ${init.accessToken}`

  try {
    let response: Response
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: init.method,
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
        // Tokens travel in the header and body only. No cookies are involved.
        credentials: 'omit',
        cache: 'no-store',
      })
    } catch (error) {
      if (timedOut) {
        throw new ApiError({
          kind: 'timeout',
          status: null,
          code: 'TIMEOUT',
          message: '서버 응답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.',
        })
      }
      // Cancelled by the caller: pass the abort through untouched.
      if (init.signal?.aborted) throw error
      throw new ApiError({
        kind: 'network',
        status: null,
        code: 'NETWORK_ERROR',
        message: '네트워크 연결을 확인하고 다시 시도해주세요.',
      })
    }

    const envelope = await readEnvelope(response)
    if (!response.ok) throw httpError(response.status, envelope)
    if (envelope?.success !== true) throw invalidResponse('success')
    return envelope.data ?? null
  } finally {
    clearTimeout(timer)
    init.signal?.removeEventListener('abort', forwardAbort)
  }
}

// ---------------------------------------------------------------------------------------------
// Refresh

let refreshInFlight: { generation: number; promise: Promise<void> } | null =
  null

/** A refresh answer that means the stored session is no longer valid. */
function isDefinitiveRefreshFailure(error: unknown) {
  return (
    error instanceof ApiError &&
    error.kind === 'http' &&
    (error.status === 400 || error.status === 401 || error.status === 403)
  )
}

function noSession(code: 'NO_SESSION' | 'SESSION_CHANGED') {
  return new ApiError({
    kind: 'http',
    status: 401,
    code,
    message: '다시 로그인해주세요.',
  })
}

async function runRefresh(generation: number) {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    endSessionOf(generation)
    throw noSession('NO_SESSION')
  }

  let data: unknown
  try {
    // Sent directly, never through `apiRequest`, so a failing refresh cannot trigger itself.
    data = await send(REFRESH_PATH, {
      method: 'POST',
      body: { refresh_token: refreshToken },
    })
  } catch (error) {
    // A network or server failure keeps the session: the token may still be valid.
    if (isDefinitiveRefreshFailure(error)) endSessionOf(generation)
    throw error
  }

  const tokens = parseTokenResponse(data)
  // Signed out or signed in again while this was out: leave the newer state alone.
  if (getSessionGeneration() !== generation) throw noSession('SESSION_CHANGED')
  saveTokens(tokens)
}

/**
 * Exchanges the refresh token for a new pair. Concurrent callers of the same session share one
 * request, because the server accepts each refresh token only once.
 */
export function refreshSession(): Promise<void> {
  const generation = getSessionGeneration()
  if (refreshInFlight?.generation !== generation) {
    const promise = runRefresh(generation).finally(() => {
      if (refreshInFlight?.promise === promise) refreshInFlight = null
    })
    refreshInFlight = { generation, promise }
  }
  return refreshInFlight.promise
}

// ---------------------------------------------------------------------------------------------
// Public request

function resolveBody(body: unknown) {
  return typeof body === 'function' ? (body as () => unknown)() : body
}

/**
 * Calls the backend and returns the response's `data`. Failures reject with `ApiError`.
 *
 * With `auth` (the default) it sends `Authorization: Bearer`. On 401 it refreshes once and
 * retries once. If the refresh is refused, or the retry is also 401, the session is cleared and
 * `onSessionEnd` listeners run, which sends the user back to the login screen. A request never
 * outlives its session: if a sign-out or another sign-in happens meanwhile, it is not retried
 * with the new tokens and it cannot end the new session.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', auth = true, signal } = options

  if (!auth) {
    return (await send(path, {
      method,
      body: resolveBody(options.body),
      signal,
    })) as T
  }

  const generation = getSessionGeneration()
  const assertSameSession = () => {
    if (getSessionGeneration() !== generation)
      throw noSession('SESSION_CHANGED')
  }

  // After a reload only the refresh token is left.
  if (!getAccessToken()) await refreshSession()
  assertSameSession()
  const firstToken = getAccessToken()

  try {
    return (await send(path, {
      method,
      body: resolveBody(options.body),
      accessToken: firstToken,
      signal,
    })) as T
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
  }

  assertSameSession()
  // Another request of this session may already have refreshed while this one was out.
  const current = getAccessToken()
  if (!current || current === firstToken) await refreshSession()
  assertSameSession()

  try {
    return (await send(path, {
      method,
      body: resolveBody(options.body),
      accessToken: getAccessToken(),
      signal,
    })) as T
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      endSessionOf(generation)
    }
    throw error
  }
}
