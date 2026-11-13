import { useCallback, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { getRecommendations, type Recommendation } from './recommendationApi'
import { CANDIDATES_PER_PAGE } from './roommateData'
import { RoommateContext, type RecommendationsState } from './roommateState'

/**
 * Keeps the list state across the roommate screens. In server mode it also keeps the
 * recommendation list, which comes whole in one request: `리스트 더보기` shows more of it
 * without asking the server again (채희 spec 7.1).
 */
export default function RoommateProvider() {
  const [visibleCount, setVisibleCount] = useState(CANDIDATES_PER_PAGE)
  const listScrollTopRef = useRef(0)
  const [recommendations, setState] = useState<RecommendationsState>({
    status: 'idle',
  })
  const statusRef = useRef<RecommendationsState['status']>('idle')
  const requestRef = useRef(0)

  // The screens hide the button once every candidate shows, so the count only grows.
  const showMore = useCallback(() => {
    setVisibleCount((count) => count + CANDIDATES_PER_PAGE)
  }, [])
  const reset = useCallback(() => {
    setVisibleCount(CANDIDATES_PER_PAGE)
    listScrollTopRef.current = 0
  }, [])

  const update = useCallback((next: RecommendationsState) => {
    statusRef.current = next.status
    setState(next)
  }, [])

  const loadRecommendations = useCallback(
    (force = false) => {
      const status = statusRef.current
      if (!force && (status === 'loading' || status === 'ready')) return
      const request = ++requestRef.current
      update({ status: 'loading' })
      getRecommendations().then(
        ({ recommendations: items }) => {
          if (request === requestRef.current) update({ status: 'ready', items })
        },
        (error: unknown) => {
          if (request === requestRef.current) update({ status: 'error', error })
        },
      )
    },
    [update],
  )

  const setRecommendations = useCallback(
    (items: Recommendation[]) => {
      // A list that is still loading must not overwrite the refreshed one.
      requestRef.current += 1
      update({ status: 'ready', items })
    },
    [update],
  )

  const value = useMemo(
    () => ({
      visibleCount,
      showMore,
      reset,
      listScrollTopRef,
      recommendations,
      loadRecommendations,
      setRecommendations,
    }),
    [
      visibleCount,
      showMore,
      reset,
      recommendations,
      loadRecommendations,
      setRecommendations,
    ],
  )

  return (
    <RoommateContext.Provider value={value}>
      <Outlet />
    </RoommateContext.Provider>
  )
}
