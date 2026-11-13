import CharacterPreview from '../onboarding/CharacterPreview'
import type { CategoryId } from '../../lib/onboarding/categories'

/**
 * A server user's character, built from their top three categories like the home character
 * (rank 1 head, 2 hand, 3 body), on the cream tile of the exported sample avatars. Each user's
 * own picture is not decided (chat OPEN_QUESTIONS CH-3), so this reuses the character parts.
 */
export default function CharacterAvatar({
  priorities,
}: {
  priorities: readonly (CategoryId | undefined)[]
}) {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden rounded-[15.7%] border-2 border-white bg-brand-cream2 shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
    >
      {/* Without the rug the character fills the top of its 302×342 stage, so it is moved up a
          little to sit in the middle of the tile. */}
      <CharacterPreview
        priorities={priorities}
        showRug={false}
        className="absolute top-[2%] left-[-2%] w-[104%]"
      />
    </span>
  )
}
