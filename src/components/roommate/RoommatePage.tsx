import { useEffect, useRef, type ReactNode } from 'react'
import bgDiamond from '../../assets/roommate/bg-diamond.svg'

/**
 * Patterned page for the analysis and the detail profile. Content taller than the screen uses the
 * scroll area of MobileLayout, so the page sets no height (docs/desktop-frame-scaling.md).
 */
export default function RoommatePage({ children }: { children: ReactNode }) {
  const pageRef = useRef<HTMLDivElement>(null)

  // The scroll area outlives page changes, so each page starts at its top.
  useEffect(() => {
    pageRef.current?.scrollIntoView?.({ block: 'start' })
  }, [])

  return (
    <div
      ref={pageRef}
      className="relative -mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex flex-1 flex-col overflow-x-clip pt-[max(47px,env(safe-area-inset-top))]"
      style={{
        backgroundImage: `url("${bgDiamond}")`,
        backgroundPosition: '1.14px -40.81px',
        backgroundSize: '129.235px 131.136px',
      }}
    >
      {children}
    </div>
  )
}
