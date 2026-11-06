import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
  type WheelEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '../../lib/onboarding/useModalLayer'

// Figma shows 2003-2007 only. The real range is not decided, so this is provisional.
export const MIN_BIRTH_YEAR = 1980
export const MAX_BIRTH_YEAR = 2012
export const DEFAULT_BIRTH_YEAR = 2005

// Slots copied from the Figma wheel (575:2028): distance from the selected year, y, color.
const SLOTS = [
  { distance: -2, top: -15, color: 'text-[#d9d9d9]' },
  { distance: -1, top: 16, color: 'text-[#a8a8a8]' },
  { distance: 1, top: 108, color: 'text-[#a8a8a8]' },
  { distance: 2, top: 146, color: 'text-[#d9d9d9]' },
]

type YearPickerSheetProps = {
  initialYear: number | null
  /** Receives focus again when the sheet closes. */
  triggerRef: RefObject<HTMLElement | null>
  onSelect: (year: number) => void
  onClose: () => void
}

export default function YearPickerSheet({
  initialYear,
  triggerRef,
  onSelect,
  onClose,
}: YearPickerSheetProps) {
  const [year, setYear] = useState(initialYear ?? DEFAULT_BIRTH_YEAR)
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const moveTo = (next: number) =>
    setYear(Math.min(MAX_BIRTH_YEAR, Math.max(MIN_BIRTH_YEAR, next)))

  useModalLayer({ overlayRef, contentRef: sheetRef, triggerRef })

  // A focused year button disappears at the edge of the range. Keep focus inside the sheet.
  useEffect(() => {
    if (!sheetRef.current?.contains(document.activeElement)) {
      sheetRef.current?.focus()
    }
  }, [year])

  const keepTabInside = (event: KeyboardEvent) => {
    const sheet = sheetRef.current
    if (!sheet) return
    const buttons = sheet.querySelectorAll('button')
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === sheet)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Tab') keepTabInside(event)
    if (event.key === 'Escape') onClose()
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      moveTo(year + (event.key === 'ArrowUp' ? -1 : 1))
    }
  }

  const handleWheel = (event: WheelEvent) => {
    if (event.deltaY !== 0) moveTo(year + Math.sign(event.deltaY))
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-20 flex justify-center md:items-center"
      onClick={onClose}
    >
      {/* Dims the MobileLayout frame on PC, or the full screen on phones. */}
      <div className="relative flex h-full w-full justify-center bg-[rgba(18,18,18,0.7)] md:h-[min(844px,100dvh)] md:w-[390px] md:overflow-hidden md:rounded-[24px]">
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label="연도 선택"
          tabIndex={-1}
          className="absolute bottom-0 h-[376px] w-full max-w-[390px] rounded-t-[29px] bg-brand-cream1 shadow-[0_0_7.3px_0_rgba(0,0,0,0.25)] outline-none"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <div className="absolute top-[9px] left-1/2 h-1 w-20 -translate-x-1/2 rounded-[10px] bg-[#efefef]" />
          <p className="absolute top-[51px] left-1/2 -translate-x-1/2 text-center text-[20px] leading-6 font-semibold tracking-[-0.2px] whitespace-nowrap text-[#1a1a1a]">
            연도 선택
          </p>
          <div
            className="absolute top-[93px] left-1/2 h-[164px] w-[196px] -translate-x-1/2 overflow-hidden"
            onWheel={handleWheel}
          >
            <div className="absolute top-[58px] left-[11px] flex w-[169px] items-center justify-center rounded-[10px] bg-brand-cream2 px-[25px] py-1">
              <p
                data-testid="selected-year"
                aria-live="polite"
                className="text-center text-[20px] leading-[1.6] font-medium tracking-[-0.5px] whitespace-nowrap text-gray-500"
              >
                {year}
              </p>
            </div>
            {SLOTS.map(({ distance, top, color }) => {
              const value = year + distance
              if (value < MIN_BIRTH_YEAR || value > MAX_BIRTH_YEAR) return null
              return (
                <button
                  key={distance}
                  type="button"
                  className={`absolute left-[95px] -translate-x-1/2 text-center text-[20px] leading-[1.6] font-medium tracking-[-0.5px] whitespace-nowrap ${color}`}
                  style={{ top }}
                  onClick={() => setYear(value)}
                >
                  {value}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className="absolute top-[291px] left-[29px] h-[65px] w-[342px] max-w-[calc(100%-48px)] rounded-[10px] bg-brand-brown1 text-center text-[20px] leading-[1.5] font-semibold text-white"
            onClick={() => onSelect(year)}
          >
            선택하기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
