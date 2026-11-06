import categoryIcons from '../../assets/onboarding/category-icons.png'
import {
  CATEGORY_LABELS,
  type CategoryId,
} from '../../lib/onboarding/categories'

/** Icon from the shared Figma image, cropped the same way as the component, and its label. */
export default function CategoryCardContent({ id }: { id: CategoryId }) {
  const { label, iconLeft } = CATEGORY_LABELS[id]
  return (
    <span className="absolute top-[calc(50%-0.5px)] left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
      <span className="relative block size-[37px] overflow-hidden">
        <img
          src={categoryIcons}
          alt=""
          className="absolute top-[-30.29%] h-[159.09%] w-[477.27%] max-w-none"
          style={{ left: `${iconLeft}%` }}
        />
      </span>
      <span className="text-[16px] leading-[1.5] font-medium whitespace-nowrap text-brand-brown3">
        {label}
      </span>
    </span>
  )
}
