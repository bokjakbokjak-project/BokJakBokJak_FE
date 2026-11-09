import rank1 from '../../assets/icons/rank-1.svg'
import rank2 from '../../assets/icons/rank-2.svg'
import rank3 from '../../assets/icons/rank-3.svg'
import type { Rank } from '../../lib/onboarding/priority'

const RANK_ICONS: Partial<Record<Rank, string>> = {
  1: rank1,
  2: rank2,
  3: rank3,
}

/** Figma `number_index`, centered above the top edge of a category card. */
export default function RankBadge({ rank }: { rank: Rank }) {
  const icon = RANK_ICONS[rank]

  return (
    <span className="absolute -top-[11.5px] left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full border-[1.5px] border-brand-brown1 bg-white">
      {icon ? (
        <img
          src={icon}
          alt={`${rank}순위`}
          className="block size-3 max-w-none -scale-x-100"
        />
      ) : (
        // Figma has badges for ranks 1-3 only, so 4 and 5 use text (OPEN_QUESTIONS DE-9).
        <span
          role="img"
          aria-label={`${rank}순위`}
          className="text-[12px] leading-none font-semibold text-brand-brown1"
        >
          {rank}
        </span>
      )}
    </span>
  )
}
