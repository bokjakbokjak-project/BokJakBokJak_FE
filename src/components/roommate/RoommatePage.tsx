import type { ReactNode } from 'react'
import { DIAMOND_BACKGROUND } from '../../lib/diamondBackground'

/**
 * Patterned page for the analysis and the detail profile. The page takes the screen height (the
 * 844px frame on PC), only the content scrolls, and the footer stays at the bottom below the
 * scroll area. A new scroll area mounts with each page, so every page starts at its top.
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
        data-testid="roommate-scroll"
        className="scrollbar-none min-h-0 flex-1 overflow-x-clip overflow-y-auto"
      >
        <div
          className="flex min-h-full flex-col pt-[max(47px,env(safe-area-inset-top))]"
          style={DIAMOND_BACKGROUND}
        >
          {children}
        </div>
      </div>
      {footer}
    </div>
  )
}
