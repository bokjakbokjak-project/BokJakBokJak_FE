import ringLarge from '../../assets/roommate/ring-large.svg'
import ringSmall from '../../assets/roommate/ring-small.svg'

// Sizes and offsets from the Figma rings on the card (1095:25871) and the analysis (1057:12891),
// which the detail profile shares. The box is the ring, and the image includes its stroke.
const VARIANTS = {
  list: {
    box: 'size-[44.805px]',
    image: ringSmall,
    inset: 'inset-[-5.8%]',
    label: 'top-[27.42px] left-[10.39px] text-[8.006px]',
    value: 'top-[7.14px] left-[7.8px] tracking-[0.2857px] text-[15.584px]',
    unit: 'text-[10.39px]',
  },
  analysis: {
    box: 'size-[69px]',
    image: ringLarge,
    inset: 'inset-[-5.8%]',
    label: 'top-[43.23px] left-[16px] text-[12.329px]',
    value: 'top-[12px] left-[12px] tracking-[0.44px] text-[24px] text-gray-500',
    unit: 'text-[16px]',
  },
}

type MatchRingProps = {
  rate: number
  variant: keyof typeof VARIANTS
  className: string
}

export default function MatchRing({
  rate,
  variant,
  className,
}: MatchRingProps) {
  const style = VARIANTS[variant]
  return (
    <div className={`absolute ${style.box} ${className}`}>
      <img
        src={style.image}
        alt=""
        className={`absolute block max-w-none ${style.inset}`}
      />
      <p
        className={`absolute leading-[1.5] font-bold whitespace-nowrap text-gray-500 ${style.value}`}
      >
        {rate}
        <span className={style.unit}>%</span>
      </p>
      <p
        className={`absolute leading-[normal] whitespace-pre text-gray-300 ${style.label}`}
      >
        {' 매칭률'}
      </p>
    </div>
  )
}
