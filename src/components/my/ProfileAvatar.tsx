import type { CategoryId } from '../../lib/onboarding/categories'
import CharacterPreview from '../onboarding/CharacterPreview'

// Figma 1532:20033 is a 100px frame with a 5.208px white stroke drawn outside it, so the box is
// 110.416px with the border inside. The character is drawn at 104.951/250 of its size, with the
// head at (-5.21, 2.08) from the frame corner, which is the content box here.
// The later `Profile2` frame (1947:31411) draws the head 104px wide at x=-2, centered in the 100px
// frame. The head is at x=20 of the 302px character stage.
function stageStyle(headWidth: number, headLeft: number) {
  const scale = headWidth / 250
  return {
    left: `${headLeft - 20 * scale}px`,
    top: '2.08px',
    width: `${302 * scale}px`,
  }
}

const STAGE_STYLE = stageStyle(104.951, -5.21)
const CENTERED_STAGE_STYLE = stageStyle(104, (100 - 104) / 2)

/** The user's character in the rounded frame of the my page and the nickname screen. */
export default function ProfileAvatar({
  priorities,
  frame = 'rounded-[47.208px] bg-my-avatar',
  centered = false,
}: {
  priorities: readonly CategoryId[]
  /** Corner and fill of the frame. The survey result card uses a squarer, yellow frame. */
  frame?: string
  /** Centers the character as in Figma `Profile2`. Off keeps the earlier offset. */
  centered?: boolean
}) {
  return (
    <div
      className={`relative mx-auto size-[110.416px] shrink-0 overflow-clip border-[5.208px] border-white shadow-[2px_2px_0_0_var(--color-my-avatar-shadow)] ${frame}`}
    >
      <div
        data-testid="profile-avatar-stage"
        className="absolute"
        style={centered ? CENTERED_STAGE_STYLE : STAGE_STYLE}
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
