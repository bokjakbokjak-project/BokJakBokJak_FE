import rank1 from '../../assets/icons/rank-1.svg'
import rank2 from '../../assets/icons/rank-2.svg'
import rank3 from '../../assets/icons/rank-3.svg'
import {
  CATEGORY_LABELS,
  type CategoryId,
} from '../../lib/onboarding/categories'
import type { Rank } from '../../lib/onboarding/priority'
import EmojiText from './EmojiText'

const RANK_BADGES = { 1: rank1, 2: rank2, 3: rank3 }

// Unselected chips differ between the Figma frames: dark text before anything is complete,
// brown text once three are chosen, and a white background only on the sleep-habit chip.
function unselectedClass(id: CategoryId, allSelected: boolean) {
  const background = id === 'sleep-habit' ? 'bg-white' : 'bg-gray-50'
  const text = allSelected ? 'text-brand-brown1' : 'text-gray-black'
  return `border-gray-100 ${background} ${text}`
}

type PriorityChipProps = {
  id: CategoryId
  rank: Rank | null
  allSelected: boolean
  onToggle: (id: CategoryId) => void
}

export default function PriorityChip({
  id,
  rank,
  allSelected,
  onToggle,
}: PriorityChipProps) {
  const { emoji, label, activeLabel, width, activeWidth } = CATEGORY_LABELS[id]
  return (
    <button
      type="button"
      aria-pressed={rank !== null}
      // Sized against its fixed slot and centered there, so a wider selected chip keeps its center.
      style={{ width: rank ? `${(activeWidth / width) * 100}%` : '100%' }}
      className={`absolute left-1/2 flex h-[38px] -translate-x-1/2 items-center justify-center rounded-[100px] border text-[16px] leading-[1.5] font-medium whitespace-nowrap ${
        rank
          ? 'border-brand-brown1 bg-brand-brown1 text-white'
          : unselectedClass(id, allSelected)
      }`}
      onClick={() => onToggle(id)}
    >
      <span className="relative top-px">
        <EmojiText
          emoji={emoji}
          text={rank ? activeLabel : label}
          emojiWidthClassName="w-4"
        />
      </span>
      {rank && (
        <img
          src={RANK_BADGES[rank]}
          alt={`${rank}순위`}
          className={`absolute size-5 max-w-none ${rank === 1 ? '-top-[5px] -left-1' : '-top-1 -left-[5px]'}`}
        />
      )}
    </button>
  )
}
