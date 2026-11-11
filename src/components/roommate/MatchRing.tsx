import ringLarge from '../../assets/roommate/ring-large.svg'

/**
 * The list ring (Figma 1686:17731): a 55px box with a 48.4px ring whose pink arc covers the match
 * rate on a gray track. Figma draws the arc from 3 o'clock clockwise (its default arc start), and
 * the 2.75px stroke takes the drawing to 53.9px, centered in the box.
 */
const LIST_RING = { size: 53.9, radius: 25.575, stroke: 2.75 }

function ListRing({ rate }: { rate: number }) {
  const { size, radius, stroke } = LIST_RING
  const center = size / 2
  const length = 2 * Math.PI * radius
  const ratio = Math.min(Math.max(rate, 0), 100) / 100
  const filled = ratio * length
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${size} ${size}`}
      className="absolute top-[0.55px] left-[0.275px] size-[53.9px] overflow-visible"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="white"
        stroke="var(--color-gray-100)"
        strokeWidth={stroke}
      />
      {filled > 0 && (
        <circle
          data-testid="match-ring-arc"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-roommate-ring)"
          strokeWidth={stroke}
          // A full ring has no dash, so no seam can show at 3 o'clock.
          strokeDasharray={ratio < 1 ? `${filled} ${length}` : undefined}
        />
      )}
    </svg>
  )
}

type MatchRingProps = {
  rate: number
  variant: 'list' | 'analysis'
  className: string
}

export default function MatchRing({
  rate,
  variant,
  className,
}: MatchRingProps) {
  if (variant === 'list') {
    return (
      <div className={`absolute size-[55px] ${className}`}>
        <ListRing rate={rate} />
        {/* Whole pixel sizes from the redrawn ring (designer note, 2026-11-12). */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-[calc(50%-0.25px)] flex w-[31px] -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-[normal] whitespace-nowrap"
        >
          <p className="font-bold tracking-[0.3143px] text-gray-500">
            <span className="text-[16px]">{rate}</span>
            <span className="text-[12px] tracking-[0.24px]">%</span>
          </p>
          <p className="text-[10px] text-gray-300">매칭률</p>
        </div>
        {/* The visible text reads as "87%매칭률", so screen readers get the label first. */}
        <span className="sr-only">매칭률 {rate}%</span>
      </div>
    )
  }

  // The analysis and the detail profile (1057:12891) still draw a full pink ring in Figma.
  return (
    <div className={`absolute size-[69px] ${className}`}>
      <img
        src={ringLarge}
        alt=""
        className="absolute inset-[-5.8%] block max-w-none"
      />
      <p className="absolute top-[12px] left-[12px] text-[24px] leading-[1.5] font-bold tracking-[0.44px] whitespace-nowrap text-gray-500">
        {rate}
        <span className="text-[16px]">%</span>
      </p>
      <p className="absolute top-[43.23px] left-[16px] text-[12.329px] leading-[normal] whitespace-pre text-gray-300">
        {' 매칭률'}
      </p>
    </div>
  )
}
