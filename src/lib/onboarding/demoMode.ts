/**
 * Demo mode for team trials on Vercel Preview links. It needs the explicit flag and the
 * environment that Vercel provides, so it stays off by default and in Production even if the
 * flag is set there by mistake. It only opens temporary screens: it creates no sign-in state
 * and does not skip the onboarding input checks.
 */
export function isDemoMode() {
  return (
    import.meta.env.VITE_DEMO_MODE === 'true' &&
    import.meta.env.VITE_VERCEL_ENV === 'preview'
  )
}

/** Temporary stand-ins for undecided backend work, used in development and demo mode only. */
export function canUseTemporaryFlow() {
  return import.meta.env.DEV || isDemoMode()
}
