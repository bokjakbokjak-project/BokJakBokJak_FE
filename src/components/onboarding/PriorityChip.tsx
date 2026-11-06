import rank1 from '../../assets/icons/rank-1.svg'
import rank2 from '../../assets/icons/rank-2.svg'
import rank3 from '../../assets/icons/rank-3.svg'
import {
  categoryCardClass,
  type CategoryId,
} from '../../lib/onboarding/categories'
import type { Rank } from '../../lib/onboarding/priority'
import CategoryCardContent from './CategoryCard'

const RANK_BADGES = { 1: rank1, 2: rank2, 3: rank3 }

type PriorityChipProps = {
  id: CategoryId
  rank: Rank | null
  onToggle: (id: CategoryId) => void
}

export default function PriorityChip({
  id,
  rank,
  onToggle,
}: PriorityChipProps) {
  return (
    <button
      type="button"
      aria-pressed={rank !== null}
      className={categoryCardClass(rank !== null)}
      onClick={() => onToggle(id)}
    >
      <CategoryCardContent id={id} />
      {rank && (
        <span className="absolute -top-[11.5px] left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full border-[1.5px] border-brand-brown1 bg-white">
          <img
            src={RANK_BADGES[rank]}
            alt={`${rank}순위`}
            className="block size-3 max-w-none -scale-x-100"
          />
        </span>
      )}
    </button>
  )
}
