import type { ReactNode } from 'react'
import { DIAMOND_BACKGROUND } from '../../lib/diamondBackground'

/**
 * Patterned page for the analysis and the detail profile. The page takes the screen height (the
 * 844px frame on PC) and does not scroll: the header and the profile card stay in place, the
 * footer stays at the bottom, and `RoommateSheet` scrolls its own content in between. A new
 * sheet mounts with each page, so every page starts at its top.
 */
export default function RoommatePage({
  children,
  footer,
}: {
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="relative -mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex h-dvh flex-col overflow-hidden bg-brand-cream1 md:h-[844px]">
      <div
        className="flex min-h-0 flex-1 flex-col overflow-x-clip pt-[max(47px,env(safe-area-inset-top))]"
        style={DIAMOND_BACKGROUND}
      >
        {children}
      </div>
      {footer}
    </div>
  )
}
