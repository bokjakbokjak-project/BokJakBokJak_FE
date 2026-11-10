import type { ReactNode } from 'react'
import arrowLeft from '../../assets/icons/arrow-left.svg'
import { useStepNavigation } from '../../lib/onboarding/useStepNavigation'

type OnboardingScreenProps = {
  step: 1 | 2 | 3 | 4
  backTo: string
  children: ReactNode
  /** Main bottom button. Every step shows it in the same place. */
  footer: ReactNode
  /** Button on the right of the header. */
  headerAction?: ReactNode
  /** Lets the content use the full width and remaining height, for the room background. */
  fullBleed?: boolean
}

// Fill widths from the Figma frames, as a share of the 342px track.
const PROGRESS_WIDTH = {
  1: `${(85 / 342) * 100}%`,
  2: `${(170 / 342) * 100}%`,
  3: `${(255 / 342) * 100}%`,
  4: '100%',
}

// The step label is placed by hand in each Figma frame, so its right edge varies.
const STEP_LABEL_POSITION = {
  1: 'right-px',
  2: 'right-px',
  3: '-right-0.5',
  4: 'right-0',
}

const CONTENT_WIDTH_CLASS = 'mx-auto w-full max-w-[390px]'

// Figma places this button at x=24, y=735 in every 390x844 step: 342x65, 44px above the bottom.
const FOOTER_CLASS = `${CONTENT_WIDTH_CLASS} relative z-20 shrink-0 px-6 pb-[max(0px,calc(44px-env(safe-area-inset-bottom)))]`

/**
 * Shared frame of steps 1-4. The top padding reserves the 47px status bar area of the
 * 390x844 Figma frame, minus what the safe area already provides on real devices.
 */
export default function OnboardingScreen({
  step,
  backTo,
  children,
  footer,
  headerAction,
  fullBleed = false,
}: OnboardingScreenProps) {
  const go = useStepNavigation()
  const footerNode = (
    <div
      data-testid="onboarding-footer"
      className={`${FOOTER_CLASS} ${fullBleed ? '' : 'mt-auto pt-6'}`}
    >
      {footer}
    </div>
  )

  return (
    <div className="flex w-full flex-1 flex-col pt-[max(0px,calc(47px-env(safe-area-inset-top)))]">
      <div className={`${CONTENT_WIDTH_CLASS} shrink-0`}>
        <header className="relative h-[60px]">
          <button
            type="button"
            aria-label="이전"
            className="absolute top-4 left-6 size-7 overflow-hidden rounded-full border-[1.5px] border-transparent transition-colors hover:border-brand-brown3 hover:bg-brand-beige1 focus-visible:border-brand-brown3 focus-visible:bg-brand-beige1"
            onClick={() => go(backTo)}
          >
            <span className="absolute inset-[calc(25%-0.38px)]">
              <span className="absolute inset-[-7.14%_-7.16%_-7.14%_-7.12%]">
                <img src={arrowLeft} alt="" className="block size-full" />
              </span>
            </span>
          </button>
          {headerAction}
        </header>
        <div
          className="relative mx-6 h-[38px]"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={step}
        >
          <div className="h-1 rounded-[100px] bg-gray-100">
            <div
              className="h-1 rounded-[100px] bg-brand-brown1"
              style={{ width: PROGRESS_WIDTH[step] }}
            />
          </div>
          <p
            className={`absolute top-[5px] text-[13px] leading-[1.5] text-gray-300 ${STEP_LABEL_POSITION[step]}`}
          >
            {step}/4
          </p>
        </div>
      </div>
      {fullBleed ? (
        <main className="relative flex min-h-0 flex-1 flex-col">
          {children}
          {footerNode}
        </main>
      ) : (
        <main className={`${CONTENT_WIDTH_CLASS} flex min-h-0 flex-col px-6`}>
          {children}
        </main>
      )}
      {!fullBleed && footerNode}
    </div>
  )
}
