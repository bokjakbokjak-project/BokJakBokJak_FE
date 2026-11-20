export const ONBOARDING_ROUTES = {
  /** The first screen sits at the root, so the address shows no `/login` (2026-11-13). */
  login: '/',
  /** 체험하기: the name screen of the guest sign-in (server mode). */
  guest: '/guest',
  school: '/onboarding/school',
  profile: '/onboarding/profile',
  dormitory: '/onboarding/dormitory',
  priority: '/onboarding/priority',
  complete: '/onboarding/complete',
} as const
