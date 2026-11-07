export const HOME_ROUTES = {
  home: '/home',
  notifications: '/notifications',
  previewMatched: '/dev/home/matched',
  previewTodayNotifications: '/dev/notifications/today',
} as const

/** Router state for the survey review, so its back button can return to the home. */
export const FROM_HOME_STATE = { from: 'home' } as const

/** History state can hold anything, so only this exact value counts as coming from the home. */
export function isFromHome(state: unknown) {
  return (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    state.from === FROM_HOME_STATE.from
  )
}
