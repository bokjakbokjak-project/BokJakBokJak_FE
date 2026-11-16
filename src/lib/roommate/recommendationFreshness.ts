import { useSyncExternalStore } from 'react'
import { getSessionGeneration } from '../auth/tokenStore'

/**
 * Whether the recommendation list kept in memory still matches the user's saved survey.
 *
 * The server keeps the computed list and computes it again from the latest survey on the next
 * `GET /api/recommendations` after a survey change (채희 spec 7.1, step 6). So a survey save that
 * changed the survey raises this version, and a list loaded for an older version is not shown;
 * it is asked for again. Nothing is sent here, and `POST /api/recommendations/refresh` is not
 * needed (spec 7.2 is the refresh button).
 *
 * The version belongs to one session: another account starts again from 0, and the roommate
 * screens are remounted for it anyway (SessionBoundary).
 */
let store = { generation: -1, version: 0 }
const listeners = new Set<() => void>()

function current() {
  const generation = getSessionGeneration()
  if (store.generation !== generation) store = { generation, version: 0 }
  return store
}

export function getRecommendationsVersion() {
  return current().version
}

/** After a survey save that changed the survey on the server (its revision went up). */
export function markRecommendationsStale() {
  const { generation, version } = current()
  store = { generation, version: version + 1 }
  for (const listener of [...listeners]) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useRecommendationsVersion() {
  return useSyncExternalStore(
    subscribe,
    getRecommendationsVersion,
    getRecommendationsVersion,
  )
}
