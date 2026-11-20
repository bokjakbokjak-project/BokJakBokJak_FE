import { useEffect, useState, type RefObject } from 'react'
import chevronDown from '../../assets/roommate/chevron-down.svg'

/** Scrolling this far counts as "the user found the scroll". */
const SCROLLED_PX = 8

/**
 * A floating down arrow above the bottom button, telling that the answers go on below
 * (requested 2026-11-20, not in Figma). It shows only while the area can scroll and goes away
 * for good once the user scrolls it. Decorative: screen readers already read the whole list.
 */
export default function ScrollHint({
  scrollRef,
}: {
  scrollRef: RefObject<HTMLElement | null>
}) {
  const [canScroll, setCanScroll] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    const area = scrollRef.current
    if (!area || hasScrolled) return
    const measure = () =>
      setCanScroll(area.scrollHeight - area.clientHeight > SCROLLED_PX)
    const onScroll = () => {
      if (area.scrollTop > SCROLLED_PX) setHasScrolled(true)
    }
    // The answer cards can arrive or change size after the first paint.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(area)
    for (const child of area.children) observer?.observe(child)
    const frame = requestAnimationFrame(measure)
    area.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      area.removeEventListener('scroll', onScroll)
    }
  }, [scrollRef, hasScrolled])

  if (!canScroll || hasScrolled) return null
  return (
    // Centered with `left` and a negative margin, so the bob animation's transform cannot add to
    // the centering (it moved the arrow off center before, 2026-11-21).
    <div
      aria-hidden
      data-testid="scroll-hint"
      className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -ml-[18px] flex size-9 items-center justify-center rounded-full border border-brand-cream3 bg-white/90 shadow-[0_2px_8px_rgba(97,71,53,0.15)] motion-safe:animate-scroll-hint"
    >
      <img src={chevronDown} alt="" className="size-6" />
    </div>
  )
}
