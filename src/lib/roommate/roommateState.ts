import { createContext, useContext, type RefObject } from 'react'

type RoommateContextValue = {
  /** How many recommended candidates the list shows. */
  visibleCount: number
  showMore: () => void
  reset: () => void
  /** Kept so the list returns to the same place after viewing a candidate. */
  listScrollTopRef: RefObject<number>
}

export const RoommateContext = createContext<RoommateContextValue | null>(null)

export function useRoommate() {
  const value = useContext(RoommateContext)
  if (!value) {
    throw new Error('useRoommate must be used inside RoommateProvider')
  }
  return value
}
