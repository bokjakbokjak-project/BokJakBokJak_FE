import { Link } from 'react-router'
import cardOrnament from '../../assets/roommate/card-ornament.svg'
import dot from '../../assets/roommate/dot.svg'
import type { RoommateCandidate } from '../../lib/roommate/roommateData'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'
import MatchRing from './MatchRing'

/** Recommendation card from Figma (1686:16341). The whole card opens the match analysis. */
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
      <div className="absolute -top-px -left-px h-[21px] w-[calc(100%+2px)] bg-roommate-pink">
        <p className="absolute top-[3px] left-[11px] text-[10px] leading-[1.5] font-semibold text-brand-brown3">
          ROOMMATE CARD
        </p>
      </div>
      <div className="absolute top-[34.5px] left-[13px] flex min-w-0 items-center gap-3 min-[390px]:gap-6">
        {/* The image includes the white outline and shadow around the 50px Figma box. */}
        <span className="relative size-[50px] shrink-0">
          <img
            src={avatar}
            alt=""
            className="absolute top-[-5.2%] left-[-5.2%] size-[112.5%] max-w-none rounded-[15.7%]"
          />
        </span>
        <div className="flex min-w-0 flex-col gap-1 text-gray-500">
          <p className="flex items-center gap-0.5 leading-[normal] font-bold whitespace-nowrap">
            {/* 16px on phones and PC alike (designer note, Figma 1686:16361). */}
            <span className="text-[16px] tracking-[0.32px]">{name}</span>
            <span className="text-[12px] tracking-[0.24px]">님</span>
          </p>
          <p className="flex items-center gap-0.5 text-[14px] leading-[1.5] font-medium whitespace-nowrap">
            <span>{age}세</span>
            <img src={dot} alt="" className="size-0.5" />
            <span>{department}</span>
          </p>
        </div>
      </div>
      <MatchRing
        rate={matchRate}
        variant="list"
        className="top-[32px] right-[12.75px]"
      />
    </Link>
  )
}
