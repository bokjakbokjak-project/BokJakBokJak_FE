import { useCallback, useEffect, useRef, useState } from 'react'

const NOTICE_DURATION = 3000

export const PENDING_TEXT = '아직 준비 중입니다.'

export type PendingNotice = {
  isShown: boolean
  text: string
  /** Shows `아직 준비 중입니다.` for 3 seconds. Showing it again restarts the time. */
  show: () => void
  /** Shows other text the same way, such as `변경된 사항이 없습니다`. */
  showText: (text: string) => void
}

/**
 * State of the "not ready" notice above the bottom bar. A page creates it when one of its own
 * buttons also needs the notice, and passes it to `BottomNav` so both share one notice.
 */
export function usePendingNotice(): PendingNotice {
  const [isShown, setIsShown] = useState(false)
  const [text, setText] = useState(PENDING_TEXT)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const showText = useCallback((next: string) => {
    clearTimeout(timerRef.current)
    setText(next)
    setIsShown(true)
    timerRef.current = setTimeout(() => setIsShown(false), NOTICE_DURATION)
  }, [])
  const show = useCallback(() => showText(PENDING_TEXT), [showText])

  return { isShown, text, show, showText }
}
