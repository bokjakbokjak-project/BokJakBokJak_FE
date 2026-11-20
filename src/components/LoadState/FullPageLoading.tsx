import type { CategoryId } from '../../lib/onboarding/categories'
import CharacterPreview from '../onboarding/CharacterPreview'

/**
 * A whole screen that waits on the server, such as the survey result reading the saved answers
 * (requested 2026-11-20: the one-line caption looked empty). The character, with its own
 * shadow, bobs on the cream page above the caption, and three dots take turns. Not in Figma; it reuses the home character
 * and the brand colors. Reduced motion keeps everything still.
 */
export default function FullPageLoading({
  label,
  hint,
  priorities = [],
}: {
  label: string
  /** A short second line under the caption. */
  hint?: string
  /** The user's character when it is known; the default character otherwise. */
  priorities?: readonly (CategoryId | undefined)[]
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex flex-1 flex-col items-center justify-center gap-6 bg-brand-cream1 px-6 md:rounded-[24px]"
    >
      <div aria-hidden className="relative w-[180px]">
        <div className="motion-safe:animate-loading-bob">
          <CharacterPreview
            priorities={priorities}
            showRug={false}
            className="relative w-full"
          />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-[18px] leading-[1.5] font-bold break-keep text-brand-brown1">
          {label}
        </p>
        {hint && (
          <p className="text-[13px] leading-[1.5] font-medium break-keep text-gray-500">
            {hint}
          </p>
        )}
        <div aria-hidden className="mt-1 flex gap-1.5">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="size-2 rounded-full bg-brand-brown3 opacity-30 motion-safe:animate-loading-dot"
              style={{ animationDelay: `${index * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
