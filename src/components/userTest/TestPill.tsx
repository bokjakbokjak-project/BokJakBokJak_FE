import type { ButtonHTMLAttributes } from 'react'

/**
 * The look shared by the user test switches (`둘러보기로 넘어가기`, `예시로 둘러보기`,
 * `직접 설문하고 매칭하기`). Not in Figma: requested 2026-11-20 to stand out more than the soft
 * pink pill. A dark brown pill with a white ring reads on both the cream pages and the pink
 * cards, and the small pink `테스트` tag tells that it belongs to the test, not to the service.
 * The tag is hidden from screen readers, so the button's name stays the label alone.
 */
export default function TestPill({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-brand-brown1 py-[5px] pr-3.5 pl-[5px] text-[12px] leading-[1.4] font-bold whitespace-nowrap text-white shadow-[0_3px_10px_rgba(97,71,53,0.35)] ring-2 ring-white transition-transform active:scale-95 ${className}`}
      {...props}
    >
      <span
        aria-hidden
        className="rounded-full bg-roommate-pink px-1.5 py-px text-[10px] leading-[1.4] font-bold text-brand-brown1"
      >
        테스트
      </span>
      {children}
    </button>
  )
}
