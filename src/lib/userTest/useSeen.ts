import { useEffect, useState, type RefObject } from 'react'

/** How much of the answers must be on screen, about one answer card. */
const SEEN_HEIGHT = 120

/**
 * True once at least 120px of the element (or all of a shorter one) was on screen. Used for "the tester looked at the
 * answers", not "the screen opened": the detail profile's answers sit below the card and can
 * need scrolling. Where IntersectionObserver is missing it counts the element as seen.
 */
export function useSeen(
  ref: RefObject<Element | null>,
  active: boolean,
): boolean {
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!active || seen || !element) return
    if (typeof IntersectionObserver === 'undefined') {
      const timer = setTimeout(() => setSeen(true), 0)
      return () => clearTimeout(timer)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const enough = entries.some(
          (entry) =>
            entry.isIntersecting &&
            entry.intersectionRect.height >=
              Math.min(SEEN_HEIGHT, entry.boundingClientRect.height) - 1,
        )
        if (enough) setSeen(true)
      },
      // Fine steps, since the answer list is much taller than the screen.
      { threshold: Array.from({ length: 21 }, (_, index) => index / 20) },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, active, seen])

  return seen
}
