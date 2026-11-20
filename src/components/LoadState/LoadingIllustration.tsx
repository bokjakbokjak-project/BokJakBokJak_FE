import alarm from '../../assets/question/loading/alarm.png'
import basin from '../../assets/question/loading/basin.png'
import broom from '../../assets/question/loading/broom.png'
import character from '../../assets/question/loading/character.png'
import pillow from '../../assets/question/loading/pillow.png'
import spray from '../../assets/question/loading/spray.png'
import towels from '../../assets/question/loading/towels.png'

// Rendered bounds in the 390×844 Figma frame 1270:18704.
const PIECES = [
  { src: character, box: [48, 510, 302, 281] },
  { src: pillow, box: [0.85, 480.18, 52.19, 48.3] },
  { src: alarm, box: [125.86, 373.07, 41.14, 40.58] },
  { src: broom, box: [207.74, 355.52, 42.29, 67.54] },
  { src: basin, box: [43.66, 417.14, 47.3, 35.25] },
  { src: towels, box: [288.36, 411.77, 40.7, 32.45] },
  { src: spray, box: [338.27, 468.07, 34.99, 41.69] },
] as const

export default function LoadingIllustration() {
  return (
    <div
      aria-hidden
      className="absolute bottom-0 left-1/2 -z-10 h-[844px] w-[390px] -translate-x-1/2"
    >
      {PIECES.map(({ src, box: [x, y, width, height] }) => (
        <img
          key={src}
          src={src}
          alt=""
          className="absolute max-w-none"
          style={{ left: x, top: y, width, height }}
        />
      ))}
    </div>
  )
}
