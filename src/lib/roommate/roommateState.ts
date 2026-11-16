import { createContext, useContext, type RefObject } from 'react'
import type { Recommendation } from './recommendationApi'

/** The server list (server mode only). `idle` until the list screen asks for it. */
export type RecommendationsState =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; items: Recommendation[] }

/** What a refresh was asked against: the survey version and the order of the requests. */
export type RefreshTicket = {
  version: number
  refresh: number
  request: number
}

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
  /** Called when a refresh is sent; its ticket goes back with the answer. */
  beginRefresh: () => RefreshTicket
  /**
   * Replaces the server list after a refresh that changed it. Returns false, keeping the list,
   * when the answer is no longer the newest: the survey changed, another refresh or a list read
   * was asked after it.
   */
  setRecommendations: (
    items: Recommendation[],
    ticket: RefreshTicket,
  ) => boolean
}

export const RoommateContext = createContext<RoommateContextValue | null>(null)

export function useRoommate() {
  const value = useContext(RoommateContext)
  if (!value) {
    throw new Error('useRoommate must be used inside RoommateProvider')
  }
  return value
}
