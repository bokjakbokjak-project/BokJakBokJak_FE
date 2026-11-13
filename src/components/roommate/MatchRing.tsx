/** Ring geometry: the drawing size, the stroke's center radius and the stroke width. */
type RingShape = { size: number; radius: number; stroke: number }

/**
 * The list ring (Figma 1686:17731): a 55px box with a 48.4px ring on a gray track. The 2.75px
 * stroke takes the drawing to 53.9px, centered in the box.
 */
const LIST_RING: RingShape = { size: 53.9, radius: 25.575, stroke: 2.75 }

/**
 * The analysis and detail profile ring (Figma 1057:12891): a 69px box whose 4px stroke reaches
 * 77px. Figma draws it as a full pink circle; it fills by the rate like the list (2026-11-13).
 */
const LARGE_RING: RingShape = { size: 77, radius: 36.5, stroke: 4 }

/**
 * Every ring starts at 12 o'clock and fills counterclockwise, to the left (requested 2026-11-13).
 * An SVG circle's stroke starts at 3 o'clock and runs clockwise, so the arc is turned a quarter
 * back and mirrored left to right.
 */
function RateRing({
  rate,
  shape,
  className,
}: {
  rate: number
  shape: RingShape
  className: string
}) {
  const { size, radius, stroke } = shape
  const center = size / 2
  const length = 2 * Math.PI * radius
  const ratio = Math.min(Math.max(rate, 0), 100) / 100
  const filled = ratio * length
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${size} ${size}`}
      className={`absolute overflow-visible ${className}`}
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
          transform={`translate(${size} 0) scale(-1 1) rotate(-90 ${center} ${center})`}
          // A full ring has no dash, so no seam can show at the start.
          strokeDasharray={ratio < 1 ? `${filled} ${length}` : undefined}
        />
      )}
    </svg>
  )
}

type MatchRingProps = {
  /** Null shows `??`, for a shared result whose reader has no match rate (Figma 1952:40101). */
  rate: number | null
  variant: 'list' | 'analysis'
  className: string
  /**
   * What a null rate means. `shared` (the default) is a shared result read without a rate (`??`).
   * `insufficient` is a server score that could not be counted for too few answers, shown as
   * `정보 부족` on an empty ring (채희 spec 7.1). 0 is a real 0%.
   */
  nullMeaning?: 'shared' | 'insufficient'
}

/** `정보 부족` on an empty gray track. Not in Figma, so it reuses the ring's own text styles. */
function InsufficientRing({
  shape,
  ringClassName,
  className,
  textClassName,
}: {
  shape: RingShape
  ringClassName: string
  className: string
  textClassName: string
}) {
  return (
    <div className={className}>
      <RateRing rate={0} shape={shape} className={ringClassName} />
      <p
        aria-hidden="true"
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center leading-[1.2] font-bold whitespace-pre text-gray-300 ${textClassName}`}
      >
        {'정보\n부족'}
      </p>
      <span className="sr-only">매칭률 정보 부족</span>
    </div>
  )
}

export default function MatchRing({
  rate,
  variant,
  className,
  nullMeaning = 'shared',
}: MatchRingProps) {
  if (rate === null && nullMeaning === 'insufficient') {
    return variant === 'list' ? (
      <InsufficientRing
        shape={LIST_RING}
        className={`absolute size-[55px] ${className}`}
        ringClassName="top-[0.55px] left-[0.275px] size-[53.9px]"
        textClassName="text-[12px]"
      />
    ) : (
      <InsufficientRing
        shape={LARGE_RING}
        className={`absolute size-[69px] ${className}`}
        ringClassName="inset-[-4px] size-[77px]"
        textClassName="text-[16px]"
      />
    )
  }
  if (variant === 'list' && rate !== null) {
    return (
      <div className={`absolute size-[55px] ${className}`}>
        <RateRing
          rate={rate}
          shape={LIST_RING}
          className="top-[0.55px] left-[0.275px] size-[53.9px]"
        />
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

  // The analysis and the detail profile (1057:12891). A shared result has no rate (`??`), so its
  // ring keeps the full pink circle of Figma.
  return (
    <div className={`absolute size-[69px] ${className}`}>
      <RateRing
        rate={rate ?? 100}
        shape={LARGE_RING}
        className="inset-[-4px] size-[77px]"
      />
      <p className="absolute top-[12px] left-[12px] text-[24px] leading-[1.5] font-bold tracking-[0.44px] whitespace-nowrap text-gray-500">
        {rate ?? '??'}
        <span className="text-[16px]">%</span>
      </p>
      <p className="absolute top-[43.23px] left-[16px] text-[12.329px] leading-[normal] whitespace-pre text-gray-300">
        {' 매칭률'}
      </p>
    </div>
  )
}
