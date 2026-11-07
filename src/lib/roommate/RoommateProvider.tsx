import { useCallback, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { CANDIDATES_PER_PAGE, getCandidates } from './roommateData'
import { RoommateContext } from './roommateState'

/** Keeps the list state across the roommate screens. Nothing is sent to a server. */
export default function RoommateProvider() {
  const [visibleCount, setVisibleCount] = useState(CANDIDATES_PER_PAGE)
  const listScrollTopRef = useRef(0)
  const showMore = useCallback(() => {
    setVisibleCount((count) =>
      Math.min(count + CANDIDATES_PER_PAGE, getCandidates().length),
    )
  }, [])
  const reset = useCallback(() => {
    setVisibleCount(CANDIDATES_PER_PAGE)
    listScrollTopRef.current = 0
  }, [])
  const value = useMemo(
    () => ({ visibleCount, showMore, reset, listScrollTopRef }),
    [visibleCount, showMore, reset],
  )

  return (
    <RoommateContext.Provider value={value}>
      <Outlet />
    </RoommateContext.Provider>
  )
}
