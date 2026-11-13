import { act, fireEvent, screen } from '@testing-library/react'
import { vi } from 'vitest'

/**
 * jsdom runs no CSS transitions, so a test ends a fade by hand. On the survey page the next
 * layer fades in only after the leaving one reports the end of its fade-out.
 */
export function endFade(element: Element) {
  fireEvent.transitionEnd(element, { propertyName: 'opacity' })
}

/** The STEP screen of the question on screen, whether it is showing or not. */
export const stepScreen = () => screen.getByLabelText(/^STEP \d+ 상황$/)

export const questionLayer = () => screen.getByTestId('question-layer')

/** Waits out the STEP screen (2 seconds) and its fade-out, so the question fades in. */
export function finishSituation() {
  act(() => vi.advanceTimersByTime(2000))
  endFade(stepScreen())
}
