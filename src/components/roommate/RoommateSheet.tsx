import type { ReactNode } from 'react'
import panelDecor from '../../assets/onboarding/panel-decor.svg'

/**
 * Rounded panel under the profile card of the analysis and the detail profile. It fills the
 * height left above the chat request bar and scrolls its own content, so the header and the card
 * stay in place. The top strip with the decoration does not scroll, so the content slides under
 * the rounded edge instead of over the decoration. With `scrolls={false}` the sheet only grows to
 * the bottom, for a page that scrolls the card and the sheet together.
 */
export default function RoommateSheet({
  labelledBy,
  scrolls = true,
  children,
}: {
  labelledBy?: string
  scrolls?: boolean
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`relative z-10 flex flex-1 flex-col rounded-t-[35px] ${scrolls ? 'min-h-0' : 'shrink-0'} bg-brand-cream1 shadow-[0_0_0_2px_var(--color-brand-brown2)]`}
    >
      <div className="relative h-[42px] shrink-0">
        <img
          src={panelDecor}
          alt=""
          className="absolute top-[15px] left-1/2 h-[27px] w-[116.003px] max-w-none -translate-x-1/2"
        />
      </div>
      {scrolls ? (
        <div
          data-testid="roommate-scroll"
          className="scrollbar-none min-h-0 flex-1 overflow-y-auto"
        >
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  )
}
