import cardChevrons from '../../assets/roommate/card-chevrons.svg'
import cardDivider from '../../assets/roommate/card-divider.svg'
import cardOrnament from '../../assets/roommate/card-ornament.svg'
import dot from '../../assets/roommate/dot.svg'
import type { ReactNode } from 'react'
import MatchRing from './MatchRing'

export type ProfileCardData = {
  name: string
  age: number | null
  department: string
  /** Left out on the user's own profile, which has no match rate (Figma 1377:35850). */
  matchRate?: number
  /** Drawn in the 100px slot. Its image may spill over the slot for its outline. */
  avatar: ReactNode
}

/**
 * The profile card of the analysis (1057:12863), the detail profile (1377:36714) and the survey
 * result (1377:35850).
 */
export default function ProfileCard({ profile }: { profile: ProfileCardData }) {
  const { name, age, department, matchRate, avatar } = profile
  const details = [age === null ? null : `${age}세`, department.trim() || null]
  return (
    <div className="relative h-[200px] overflow-hidden rounded-[12px] border-[1.5px] border-roommate-pink bg-brand-cream1">
      <img
        src={cardOrnament}
        alt=""
        className="absolute top-[69.25px] left-[151.25px] h-[91px] w-[160px] max-w-none"
      />
      <div className="absolute inset-x-0 top-0 h-[43.5px] rounded-t-[12px] bg-roommate-pink" />
      <div className="absolute top-[14.25px] left-[24.25px] flex items-center gap-2.5">
        <p className="text-[12px] leading-[1.5] font-semibold text-brand-brown3">
          ROOMMATE CARD
        </p>
        <img
          src={cardChevrons}
          alt=""
          className="h-[11.5px] w-[42.5px] max-w-none -scale-x-100 max-[339px]:hidden"
        />
      </div>
      <div className="absolute top-[62.25px] left-3 flex items-center gap-3 min-[390px]:left-[25.25px] min-[390px]:gap-[26px]">
        {/* The image includes the white outline and shadow around the 100px Figma box. */}
        <span className="relative size-[84px] shrink-0 min-[390px]:size-[100px]">
          {avatar}
        </span>
        <div className="flex flex-col gap-2 text-gray-500">
          <p className="text-[12px] leading-[normal] text-gray-300">프로필</p>
          <div className="flex flex-col gap-[3px]">
            <h2 className="flex items-end gap-[3px] leading-[normal] font-bold whitespace-nowrap">
              <span className="text-[20px] tracking-[0.4px]">{name}</span>
              <span className="text-[14px] tracking-[0.28px]">님</span>
            </h2>
            <p className="flex items-center gap-[3px] text-[14px] leading-[1.5] font-medium whitespace-nowrap">
              {details
                .filter((detail) => detail !== null)
                .map((detail, index) => (
                  <span key={detail} className="contents">
                    {index > 0 && <img src={dot} alt="" className="size-0.5" />}
                    <span>{detail}</span>
                  </span>
                ))}
            </p>
          </div>
        </div>
      </div>
      <p className="absolute top-[176.25px] right-3 text-[12px] leading-[1.5] font-medium text-brand-cream3">
        BOCKJAK
      </p>
      <img
        src={cardDivider}
        alt=""
        className="absolute top-[180.25px] left-0 h-0.5 w-[calc(100%-74px)] max-w-none"
      />
      <img
        src={cardDivider}
        alt=""
        className="absolute top-[188.25px] left-0 h-0.5 w-[calc(100%-74px)] max-w-none"
      />
      {matchRate !== undefined && (
        <MatchRing
          rate={matchRate}
          variant="analysis"
          className="top-[13.5px] right-[27.25px]"
        />
      )}
    </div>
  )
}
