import { createContext, useContext, type RefObject } from 'react'
import type { Recommendation } from './recommendationApi'

/** The server list (server mode only). `idle` until the list screen asks for it. */
export type RecommendationsState =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; items: Recommendation[] }

type RoommateContextValue = {
  /** How many recommended candidates the list shows. */
  visibleCount: number
  showMore: () => void
  reset: () => void
  /** Kept so the list returns to the same place after viewing a candidate. */
  listScrollTopRef: RefObject<number>
  recommendations: RecommendationsState
  /** Loads the server list unless it is loaded or loading. `force` loads it again. */
  loadRecommendations: (force?: boolean) => void
  /** Replaces the server list, such as after a refresh that changed it. */
  setRecommendations: (items: Recommendation[]) => void
}

export const RoommateContext = createContext<RoommateContextValue | null>(null)

export function useRoommate() {
  const value = useContext(RoommateContext)
  if (!value) {
    throw new Error('useRoommate must be used inside RoommateProvider')
  }
  return value
}
