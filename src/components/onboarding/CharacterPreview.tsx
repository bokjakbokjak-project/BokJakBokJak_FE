import type { CategoryId } from '../../lib/onboarding/categories'
import {
  getCharacterLayers,
  STAGE,
  type CharacterLayer,
} from '../../lib/onboarding/character'

const percentOf = (value: number, total: number) => `${(value / total) * 100}%`

/** Heads whose own face is Figma's face_Smile, so they can open with face_normal first. */
const SMILING_HEADS = new Set(['default', 'sleep-habit'])

/**
 * Figma face_normal eyes (715:1599) in the 250×214 head box, drawn over the smile arcs of
 * face_Smile (715:1600). The cream patches hide the arcs until the layer fades out.
 */
function OpenEyes() {
  return (
    <svg
      viewBox="0 0 250 214"
      aria-hidden
      data-testid="greet-eyes"
      className="absolute inset-0 size-full motion-safe:animate-greet-eyes motion-reduce:hidden"
    >
      <rect x="82.5" y="140.5" width="14.5" height="8.5" fill="#FFF8F0" />
      <rect x="155.5" y="140.5" width="14.5" height="8.5" fill="#FFF8F0" />
      <circle cx="88.77" cy="147.82" r="5.06" fill="#212121" />
      <circle cx="163.39" cy="147.82" r="5.06" fill="#212121" />
    </svg>
  )
}

function layerStyle(layer: CharacterLayer) {
  return {
    left: percentOf(layer.x, STAGE.width),
    top: percentOf(layer.y, STAGE.height),
    width: percentOf(layer.width, STAGE.width),
    height: percentOf(layer.height, STAGE.height),
  }
}

/**
 * Composes the character from Figma parts. Positions are percentages of the Figma group,
 * so the character keeps its proportions when a narrow screen shrinks the stage.
 */
export default function CharacterPreview({
  priorities,
  showRug = true,
  greet = false,
  className = 'relative mx-auto w-full max-w-[302px]',
}: {
  priorities: readonly (CategoryId | undefined)[]
  /** The home and notification frames draw the character without its rug. */
  showRug?: boolean
  /** The home greeting: open eyes, then a smile with a small nod of the head. */
  greet?: boolean
  className?: string
}) {
  const layers = getCharacterLayers(priorities).filter(
    ({ key }) => showRug || key !== 'rug',
  )

  return (
    <div
      role="img"
      aria-label="선택한 생활습관에 따라 꾸며진 캐릭터"
      className={`aspect-[302/342] shrink-0 ${className}`}
    >
      {layers.map((layer) => {
        const image = (
          <img
            key={layer.key}
            src={layer.src}
            alt=""
            data-layer={layer.key}
            data-variant={layer.variant}
            className="absolute h-auto max-w-none"
            style={
              greet && layer.key === 'head'
                ? { inset: 0, width: '100%', height: '100%' }
                : layerStyle(layer)
            }
          />
        )
        if (!greet || layer.key !== 'head') return image
        return (
          <div
            key={layer.key}
            className="absolute motion-safe:animate-greet-nod"
            style={layerStyle(layer)}
          >
            {image}
            {SMILING_HEADS.has(layer.variant ?? '') && <OpenEyes />}
          </div>
        )
      })}
    </div>
  )
}
