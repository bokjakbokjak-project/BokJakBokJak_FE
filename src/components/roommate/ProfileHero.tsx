import type { ReactNode } from 'react'
import cardRibbon from '../../assets/roommate/card-ribbon.svg'
import ProfileCard, { type ProfileCardData } from './ProfileCard'

/**
 * The profile card with its tilted back card and ribbon, between the header and the cream panel
 * (Figma 1058:11977 on the analysis, 1377:36709 on the detail profile, 1377:35844 on the survey
 * result). The block is 293px tall, so the panel starts at y=396. Figma drew the card 9px lower
 * on the detail profile; QA 12 called that a design error, so every screen uses the analysis
 * position.
 */
export default function ProfileHero({
  profile,
  children,
}: {
  profile: ProfileCardData
  /** Drawn behind the card, such as the `상세프로필 보기` tab. */
  children?: ReactNode
}) {
  return (
    <div className="relative mx-auto h-[293px] w-full max-w-[390px] shrink-0">
      <div className="absolute inset-0">
        <img
          src={cardRibbon}
          alt=""
          className="absolute top-[203.94px] right-[53px] h-[69.058px] w-[80.953px] max-w-none"
        />
        <div className="absolute -top-[9px] right-[3px] flex h-[249.909px] w-[308px] items-center justify-center">
          <div className="h-[204.073px] w-[276.062px] shrink-0 rotate-[10.24deg] rounded-[14px] bg-roommate-card-back" />
        </div>
        {children}
        <div className="absolute inset-x-6 top-[13.58px]">
          <ProfileCard profile={profile} />
        </div>
      </div>
    </div>
  )
}
