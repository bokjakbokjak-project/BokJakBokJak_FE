import { isApiError } from './apiError'

/** Shown when a failure carries no message of its own. Not in Figma. */
export const FALLBACK_ERROR_TEXT =
  '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'

/**
 * The text to show for a failed request: the server's own message for an error answer (the
 * backend writes them in Korean), and the client's message for a network, timeout or config
 * failure. Anything else gets the fallback.
 */
export function errorText(error: unknown, fallback = FALLBACK_ERROR_TEXT) {
  if (isApiError(error) && error.kind !== 'invalid-response' && error.message) {
    return error.message
  }
  return fallback
}

/** The server `code` of a failed request, or null when it was not an API error. */
export function errorCode(error: unknown) {
  return isApiError(error) ? error.code : null
}
