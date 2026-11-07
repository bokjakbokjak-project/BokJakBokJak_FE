import type { CategoryId } from '../../lib/onboarding/categories'
import { getCharacterLayers, STAGE } from '../../lib/onboarding/character'

const percentOf = (value: number, total: number) => `${(value / total) * 100}%`

/**
 * Composes the character from Figma parts. Positions are percentages of the Figma group,
 * so the character keeps its proportions when a narrow screen shrinks the stage.
 */
export default function CharacterPreview({
  priorities,
  showRug = true,
  className = 'relative mx-auto w-full max-w-[302px]',
}: {
  priorities: readonly CategoryId[]
  /** The home and notification frames draw the character without its rug. */
  showRug?: boolean
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
      {layers.map((layer) => (
        <img
          key={layer.key}
          src={layer.src}
          alt=""
          data-layer={layer.key}
          data-variant={layer.variant}
          className="absolute h-auto max-w-none"
          style={{
            left: percentOf(layer.x, STAGE.width),
            top: percentOf(layer.y, STAGE.height),
            width: percentOf(layer.width, STAGE.width),
            height: percentOf(layer.height, STAGE.height),
          }}
        />
      ))}
    </div>
  )
}
