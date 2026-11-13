import { isDemoMode } from '../onboarding/demoMode'

const STORAGE_KEY = 'bokjak-qa'

/**
 * Turns on the QA tools for this browser tab when the address has `?qa=1`, and off with `?qa=0`.
 * Production is where the team runs QA, so the tools exist there too, but only behind this flag,
 * so ordinary visitors never see them (requested 2026-11-13, question OPEN_QUESTIONS PL-8).
 */
export function readQaFlagFromUrl(search: string) {
  const flag = new URLSearchParams(search).get('qa')
  if (flag === null) return
  try {
    if (flag === '1') sessionStorage.setItem(STORAGE_KEY, '1')
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be blocked. The tools then stay off on Production.
  }
}

/** Always on in development and the Preview demo, otherwise only after `?qa=1`. */
export function isQaMode() {
  if (import.meta.env.DEV || isDemoMode()) return true
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}
