export const MY_ROUTES = {
  my: '/my',
  editName: '/my/edit-name',
} as const

/** Router state for the nickname screen, so leaving it returns to the same history entry. */
export const FROM_MY_STATE = { from: 'my' } as const

/** History state can hold anything, so only this exact value counts as coming from the my page. */
export function isFromMy(state: unknown) {
  return (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    state.from === FROM_MY_STATE.from
  )
}
