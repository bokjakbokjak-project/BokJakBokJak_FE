import { useEffect, useState } from 'react'
import alarm from '../../assets/question/loading/alarm.png'
import basin from '../../assets/question/loading/basin.png'
import broom from '../../assets/question/loading/broom.png'
import character from '../../assets/question/loading/character.png'
import pillow from '../../assets/question/loading/pillow.png'
import spray from '../../assets/question/loading/spray.png'
import towels from '../../assets/question/loading/towels.png'

// Rendered bounds in the 390×844 Figma frame 1270:18704.
const CHARACTER = { src: character, box: [48, 510, 302, 281] } as const

/** The things around the character, from left to right: the order they appear in. */
const ITEMS = [
  { src: pillow, box: [0.85, 480.18, 52.19, 48.3] },
  { src: basin, box: [43.66, 417.14, 47.3, 35.25] },
  { src: alarm, box: [125.86, 373.07, 41.14, 40.58] },
  { src: broom, box: [207.74, 355.52, 42.29, 67.54] },
  { src: towels, box: [288.36, 411.77, 40.7, 32.45] },
  { src: spray, box: [338.27, 468.07, 34.99, 41.69] },
] as const

/** One more thing every this long, then a pause with all of them, then from the start again. */
const STEP_MS = 350
const HOLD_MS = 900

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

/**
 * How many of the things show now (requested 2026-11-21): they appear one by one from the left,
 * like a loading bar, and once all have appeared they start over. Reduced motion shows them all.
 */
function useShownCount() {
  const [isStill] = useState(prefersReducedMotion)
  const [count, setCount] = useState(isStill ? ITEMS.length : 0)

  useEffect(() => {
    if (isStill) return
    const delay = count === ITEMS.length ? HOLD_MS : STEP_MS
    const timer = window.setTimeout(
      () => setCount((current) => (current === ITEMS.length ? 0 : current + 1)),
      delay,
    )
    return () => window.clearTimeout(timer)
  }, [count, isStill])

  return count
}

export default function LoadingIllustration() {
  const shown = useShownCount()
  const [x, y, width, height] = CHARACTER.box

  return (
    <div
      aria-hidden
      className="absolute bottom-0 left-1/2 -z-10 h-[844px] w-[390px] -translate-x-1/2"
    >
      <img
        src={CHARACTER.src}
        alt=""
        className="absolute max-w-none"
        style={{ left: x, top: y, width, height }}
      />
      {ITEMS.map(({ src, box: [left, top, w, h] }, index) => (
        <img
          key={src}
          src={src}
          alt=""
          data-shown={index < shown || undefined}
          className={`absolute max-w-none transition-[opacity,scale] duration-300 ease-out ${
            index < shown ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          }`}
          style={{ left, top, width: w, height: h }}
        />
      ))}
    </div>
  )
}
