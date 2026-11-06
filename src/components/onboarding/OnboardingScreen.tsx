import type { ReactNode } from 'react'
import arrowLeft from '../../assets/icons/arrow-left.svg'
import { useStepNavigation } from '../../lib/onboarding/useStepNavigation'

type OnboardingScreenProps = {
  step: 1 | 2 | 3 | 4
  backTo: string
  children: ReactNode
  footer: ReactNode
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
  3: '-right-px',
  4: 'right-0',
}

/**
 * Shared frame of steps 1-4. The top padding reserves the 47px status bar area of the
 * 390x844 Figma frame, minus what the safe area already provides on real devices.
 */
export default function OnboardingScreen({
  step,
  backTo,
  children,
  footer,
}: OnboardingScreenProps) {
  const go = useStepNavigation()

  return (
    <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col pt-[max(0px,calc(47px-env(safe-area-inset-top)))]">
      <header className="relative h-[60px] shrink-0">
        <button
          type="button"
          aria-label="이전"
          className="absolute top-4 left-6 size-7"
          onClick={() => go(backTo)}
        >
          <img src={arrowLeft} alt="" className="size-7" />
        </button>
      </header>
      <div
        className="relative mx-6 h-[38px] shrink-0"
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
      <main className="flex min-h-0 flex-col px-6">{children}</main>
      <div className="mt-auto px-6 pt-6 pb-[max(0px,calc(56px-env(safe-area-inset-bottom)))]">
        {footer}
      </div>
    </div>
  )
}
