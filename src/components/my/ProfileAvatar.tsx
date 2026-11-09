import type { CategoryId } from '../../lib/onboarding/categories'
import CharacterPreview from '../onboarding/CharacterPreview'

// Figma 1532:20033 is a 100px frame with a 5.208px white stroke drawn outside it, so the box is
// 110.416px with the border inside. The character is drawn at 104.951/250 of its size, with the
// head at (-5.21, 2.08) from the frame corner, which is the content box here.
const SCALE = 104.951 / 250
const STAGE_STYLE = {
  left: `${-5.21 - 20 * SCALE}px`,
  top: '2.08px',
  width: `${302 * SCALE}px`,
}

/** The user's character in the rounded frame of the my page and the nickname screen. */
export default function ProfileAvatar({
  priorities,
}: {
  priorities: readonly CategoryId[]
}) {
  return (
    <div className="relative mx-auto size-[110.416px] shrink-0 overflow-clip rounded-[47.208px] border-[5.208px] border-white bg-my-avatar shadow-[2px_2px_0_0_var(--color-my-avatar-shadow)]">
      <div className="absolute" style={STAGE_STYLE}>
        <CharacterPreview
          priorities={priorities}
          showRug={false}
          className="relative w-full"
        />
      </div>
    </div>
  )
}
