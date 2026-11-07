import { Link } from 'react-router'
import cardOrnament from '../../assets/roommate/card-ornament.svg'
import dotSmall from '../../assets/roommate/dot-small.svg'
import type { RoommateCandidate } from '../../lib/roommate/roommateData'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'
import MatchRing from './MatchRing'

/** Recommendation card from Figma (1095:25845). The whole card opens the match analysis. */
export default function RoommateCard({
  candidate,
}: {
  candidate: RoommateCandidate
}) {
  const { id, name, age, department, matchRate, avatar } = candidate
  return (
    <Link
      to={ROOMMATE_ROUTES.analysis(id)}
      className="relative block h-[103px] w-full shrink-0 overflow-hidden rounded-[12px] border border-roommate-pink bg-brand-beige5"
    >
      <img
        src={cardOrnament}
        alt=""
        className="absolute top-[13px] left-[92px] h-[91px] w-[160px] max-w-none"
      />
      <div className="absolute inset-x-0 top-0 h-5 bg-roommate-pink">
        <p className="absolute top-0.5 left-2.5 text-[10px] leading-[1.5] font-semibold text-brand-brown3">
          ROOMMATE CARD
        </p>
      </div>
      <div className="absolute top-[31px] left-2.5 flex items-center gap-2 min-[390px]:gap-6">
        {/* The image includes the white outline and shadow around the 50px Figma box. */}
        <span className="relative size-[50px] shrink-0">
          <img
            src={avatar}
            alt=""
            className="absolute top-[-5.2%] left-[-5.2%] size-[112.5%] max-w-none rounded-[15.7%]"
          />
        </span>
        <div className="flex flex-col gap-[1.5px] text-gray-500">
          <p className="flex items-end gap-[1.5px] leading-[normal] font-bold whitespace-nowrap">
            <span className="text-[14px] tracking-[0.28px]">{name}</span>
            <span className="text-[7px] tracking-[0.14px]">님</span>
          </p>
          <p className="flex items-center gap-[1.5px] text-[14px] leading-[1.5] font-medium whitespace-nowrap">
            <span>{age}세</span>
            <img src={dotSmall} alt="" className="size-px" />
            <span>{department}</span>
          </p>
        </div>
      </div>
      <MatchRing
        rate={matchRate}
        variant="list"
        className="top-[34.85px] right-[18.35px]"
      />
    </Link>
  )
}
