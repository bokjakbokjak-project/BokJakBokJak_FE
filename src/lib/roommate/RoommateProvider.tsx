import { useCallback, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { getRecommendations, type Recommendation } from './recommendationApi'
import {
  getRecommendationsVersion,
  useRecommendationsVersion,
} from './recommendationFreshness'
import { CANDIDATES_PER_PAGE } from './roommateData'
import {
  RoommateContext,
  type RecommendationsState,
  type RefreshTicket,
} from './roommateState'

const IDLE: RecommendationsState = { status: 'idle' }

/**
 * Keeps the list state across the roommate screens. In server mode it also keeps the
 * recommendation list, which comes whole in one request: `리스트 더보기` shows more of it
 * without asking the server again (채희 spec 7.1).
 *
 * The list belongs to the survey it was loaded for. After a survey save that changed the survey
 * (recommendationFreshness), the kept list reads as not loaded, so no screen shows its order or
 * match rates, and the next load asks the server again.
 */
export default function RoommateProvider() {
  const [visibleCount, setVisibleCount] = useState(CANDIDATES_PER_PAGE)
  const listScrollTopRef = useRef(0)
  const version = useRecommendationsVersion()
  const [state, setState] = useState<{
    value: RecommendationsState
    /** The survey version the list (or the load under way) is for. */
    version: number
  }>(() => ({ value: IDLE, version: getRecommendationsVersion() }))
  const statusRef = useRef<RecommendationsState['status']>('idle')
  const versionRef = useRef(state.version)
  const requestRef = useRef(0)
  const refreshRef = useRef(0)

  // The screens hide the button once every candidate shows, so the count only grows.
  const showMore = useCallback(() => {
    setVisibleCount((count) => count + CANDIDATES_PER_PAGE)
  }, [])
  const reset = useCallback(() => {
    setVisibleCount(CANDIDATES_PER_PAGE)
    listScrollTopRef.current = 0
  }, [])

  const update = useCallback(
    (next: RecommendationsState, forVersion: number) => {
      statusRef.current = next.status
      versionRef.current = forVersion
      setState({ value: next, version: forVersion })
    },
    [],
  )

  // Depends on `version`, so a list screen that is open when the survey changes loads again
  // (its effect depends on this function).
  const loadRecommendations = useCallback(
    (force = false) => {
      const status = statusRef.current
      const isFresh = versionRef.current === version
      if (!force && isFresh && (status === 'loading' || status === 'ready')) {
        return
      }
      // A list for another survey starts again from the top.
      if (!isFresh) reset()
      const request = ++requestRef.current
      // The answer is kept for the survey version it was asked for. If the survey changes while
      // it is out, it is not shown, and the next load asks again.
      update({ status: 'loading' }, version)
      getRecommendations().then(
        ({ recommendations: items }) => {
          if (request === requestRef.current) {
            update({ status: 'ready', items }, version)
          }
        },
        (error: unknown) => {
          if (request === requestRef.current) {
            update({ status: 'error', error }, version)
          }
        },
      )
    },
    [update, reset, version],
  )

  const beginRefresh = useCallback(
    (): RefreshTicket => ({
      version: getRecommendationsVersion(),
      refresh: ++refreshRef.current,
      request: requestRef.current,
    }),
    [],
  )

  const setRecommendations = useCallback(
    (items: Recommendation[], ticket: RefreshTicket) => {
      // Only the newest answer is kept. A refresh is dropped when it was asked for an older
      // survey, when another refresh was asked after it (the list screen can be left and opened
      // again while one is out), or when a list was asked for after it.
      if (
        ticket.version !== getRecommendationsVersion() ||
        ticket.refresh !== refreshRef.current ||
        ticket.request !== requestRef.current
      ) {
        return false
      }
      // A list that is still loading must not overwrite the refreshed one.
      requestRef.current += 1
      update({ status: 'ready', items }, ticket.version)
      return true
    },
    [update],
  )

  const recommendations = state.version === version ? state.value : IDLE

  const value = useMemo(
    () => ({
      visibleCount,
      showMore,
      reset,
      listScrollTopRef,
      recommendations,
      loadRecommendations,
      beginRefresh,
      setRecommendations,
    }),
    [
      visibleCount,
      showMore,
      reset,
      recommendations,
      loadRecommendations,
      beginRefresh,
      setRecommendations,
    ],
  )

  return (
    <RoommateContext.Provider value={value}>
      <Outlet />
    </RoommateContext.Provider>
  )
}
