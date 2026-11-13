import type { CategoryId } from '../../lib/onboarding/categories'
import CharacterPreview from '../onboarding/CharacterPreview'

// Figma Profile2 (1947:30419) on the my page 1931:27101: a 100px frame whose 5.208px white
// border is inside it. The character is drawn at 104/250 of its size with the head at (-2, 2.08)
// from the frame corner, so the 104px head is centered in the 100px frame (QA 10). Absolute
// children start inside the border, so the border width comes off both offsets.
const BORDER = 5.208
const SCALE = 104 / 250
const STAGE_STYLE = {
  left: `${-2 - BORDER - 20 * SCALE}px`,
  top: `${2.08 - BORDER}px`,
  width: `${302 * SCALE}px`,
}
// On the my page and the nickname screen, Profile2 draws the white stroke outside the 100px frame
// (measured in 1931:27101: the white ring spans 110px). The box is then 110.416px, and absolute
// children start at the 100px frame, so the Figma offsets apply as they are.
const OUTSIDE_STAGE_STYLE = {
  left: `${-2 - 20 * SCALE}px`,
  top: '2.08px',
  width: `${302 * SCALE}px`,
}

/**
 * The user's character in its rounded frame. The my page, the nickname screen and the survey
 * result card share it, so the character sits the same way everywhere (QA 10).
 */
export default function ProfileAvatar({
  priorities,
  frame = 'rounded-[30px] bg-card-avatar',
  strokeOutside = false,
}: {
  /** Ranks 1-3 set the parts. A server profile may leave a rank empty for an unknown code. */
  priorities: readonly (CategoryId | undefined)[]
  /** Corner and fill of the frame. The survey result card uses its own corner. */
  frame?: string
  /** Keeps the 100px frame and draws the white stroke around it, as Profile2 does. */
  strokeOutside?: boolean
}) {
  return (
    <div
      data-testid="profile-avatar"
      className={`relative mx-auto ${strokeOutside ? 'size-[110.416px]' : 'size-[100px]'} shrink-0 overflow-clip border-[5.208px] border-white shadow-[2px_2px_0_0_var(--color-my-avatar-shadow)] ${frame}`}
    >
      <div
        className="absolute"
        style={strokeOutside ? OUTSIDE_STAGE_STYLE : STAGE_STYLE}
      >
        <CharacterPreview
          priorities={priorities}
          showRug={false}
          className="relative w-full"
        />
      </div>
    </div>
  )
}
