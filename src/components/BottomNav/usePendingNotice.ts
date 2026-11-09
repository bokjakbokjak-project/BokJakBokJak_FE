import { useCallback, useEffect, useRef, useState } from 'react'

const NOTICE_DURATION = 3000

export type PendingNotice = {
  isShown: boolean
  /** Shows `아직 준비 중입니다.` for 3 seconds. Showing it again restarts the time. */
  show: () => void
}

/**
 * State of the "not ready" notice above the bottom bar. A page creates it when one of its own
 * buttons also needs the notice, and passes it to `BottomNav` so both share one notice.
 */
export function usePendingNotice(): PendingNotice {
  const [isShown, setIsShown] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const show = useCallback(() => {
    clearTimeout(timerRef.current)
    setIsShown(true)
    timerRef.current = setTimeout(() => setIsShown(false), NOTICE_DURATION)
  }, [])

  return { isShown, show }
}
