/**
 * - `http`: the server answered with an error status (the common `{ success: false }` body).
 * - `network`: the request never got an answer (offline, CORS, DNS).
 * - `timeout`: no answer within the time limit.
 * - `config`: the API address is missing or unsafe, so nothing was sent.
 * - `invalid-response`: the server answered, but not in the agreed shape.
 */
export type ApiErrorKind =
  'http' | 'network' | 'timeout' | 'config' | 'invalid-response'

type ApiErrorInit = {
  kind: ApiErrorKind
  /** HTTP status, or null when there was no answer. */
  status: number | null
  /** Server `code` such as `INVALID_REFRESH_TOKEN`, or a local one for non-HTTP failures. */
  code: string
  message: string
  /** Server `errors`: field name to message. */
  fieldErrors?: Readonly<Record<string, string>>
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly code: string
  readonly fieldErrors: Readonly<Record<string, string>>

  constructor(init: ApiErrorInit) {
    super(init.message)
    this.name = 'ApiError'
    this.kind = init.kind
    this.status = init.status
    this.code = init.code
    this.fieldErrors = init.fieldErrors ?? {}
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function invalidResponse(detail: string) {
  return new ApiError({
    kind: 'invalid-response',
    status: null,
    code: 'INVALID_RESPONSE',
    message: `서버 응답을 확인할 수 없어요. (${detail})`,
  })
}
