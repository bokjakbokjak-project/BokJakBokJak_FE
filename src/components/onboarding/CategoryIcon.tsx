import categoryIcons from '../../assets/onboarding/category-icons.png'
import {
  CATEGORY_LABELS,
  type CategoryId,
} from '../../lib/onboarding/categories'

/**
 * The 37px category icon of the Figma `우선순위` component (1041:30261). The first five come from
 * one shared image cropped per card; 온도 has an image of its own, placed as in 2441:22419.
 */
export default function CategoryIcon({ id }: { id: CategoryId }) {
  const { icon } = CATEGORY_LABELS[id]
  return (
    <span className="relative block size-[37px] shrink-0 overflow-hidden">
      {icon.kind === 'sprite' ? (
        <img
          src={categoryIcons}
          alt=""
          className="absolute top-[-30.29%] h-[159.09%] w-[477.27%] max-w-none"
          style={{ left: `${icon.left}%` }}
        />
      ) : (
        <img
          src={icon.src}
          alt=""
          className="absolute top-[9.75%] left-0 h-[91.39%] w-full max-w-none"
        />
      )}
    </span>
  )
}
