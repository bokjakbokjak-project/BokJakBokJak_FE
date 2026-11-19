import {
  CATEGORY_LABELS,
  type CategoryId,
} from '../../lib/onboarding/categories'
import CategoryIcon from './CategoryIcon'

/** Icon and label of a category card, placed the same way as the Figma component. */
export default function CategoryCardContent({ id }: { id: CategoryId }) {
  const { label } = CATEGORY_LABELS[id]
  return (
    <span className="absolute top-[calc(50%-0.5px)] left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
      <CategoryIcon id={id} />
      <span className="text-[16px] leading-[1.5] font-medium whitespace-nowrap text-brand-brown3">
        {label}
      </span>
    </span>
  )
}
