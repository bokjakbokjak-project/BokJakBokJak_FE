import {
  categoryCardClass,
  type CategoryId,
} from '../../lib/onboarding/categories'
import type { Rank } from '../../lib/onboarding/priority'
import CategoryCardContent from './CategoryCard'
import RankBadge from './RankBadge'

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
      {rank && <RankBadge rank={rank} />}
    </button>
  )
}
