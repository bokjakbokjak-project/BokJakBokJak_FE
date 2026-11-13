import { invalidResponse } from './apiError'

/**
 * Readers for the snake_case `data` the live server sends (checked on 2026-11-13, matching the
 * Notion spec, while Swagger shows camelCase). Each API maps the fields it uses to the app's
 * camelCase models at this boundary and fails loudly on a changed contract, instead of showing
 * half a screen.
 */

export type JsonObject = Record<string, unknown>

export function asObject(value: unknown, field = 'data'): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidResponse(field)
  }
  return value as JsonObject
}

export function readArray(data: JsonObject, key: string): unknown[] {
  const value = data[key]
  if (!Array.isArray(value)) throw invalidResponse(key)
  return value
}

export function readString(data: JsonObject, key: string): string {
  const value = data[key]
  if (typeof value !== 'string') throw invalidResponse(key)
  return value
}

export function readNullableString(
  data: JsonObject,
  key: string,
): string | null {
  const value = data[key]
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw invalidResponse(key)
  return value
}

export function readNumber(data: JsonObject, key: string): number {
  const value = data[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalidResponse(key)
  }
  return value
}

export function readNullableNumber(
  data: JsonObject,
  key: string,
): number | null {
  const value = data[key]
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalidResponse(key)
  }
  return value
}

export function readBoolean(data: JsonObject, key: string): boolean {
  const value = data[key]
  if (typeof value !== 'boolean') throw invalidResponse(key)
  return value
}

export function readStringArray(data: JsonObject, key: string): string[] {
  return readArray(data, key).map((item) => {
    if (typeof item !== 'string') throw invalidResponse(key)
    return item
  })
}

/** A value from a closed set, such as a status. Unknown values fail like a missing field. */
export function readEnum<T extends string>(
  data: JsonObject,
  key: string,
  values: readonly T[],
): T {
  const value = readString(data, key)
  if (!values.includes(value as T)) throw invalidResponse(key)
  return value as T
}

export function readNullableEnum<T extends string>(
  data: JsonObject,
  key: string,
  values: readonly T[],
): T | null {
  const value = readNullableString(data, key)
  if (value === null) return null
  if (!values.includes(value as T)) throw invalidResponse(key)
  return value as T
}

/**
 * A server id from a route segment or an error field (`"45"` or `45`), or null. Ids are positive
 * whole numbers, so anything else never reaches a request path.
 */
export function parseId(value: unknown): number | null {
  const text =
    typeof value === 'number'
      ? String(value)
      : typeof value === 'string'
        ? value
        : ''
  if (!/^[1-9]\d{0,15}$/.test(text)) return null
  const id = Number(text)
  return Number.isSafeInteger(id) ? id : null
}
