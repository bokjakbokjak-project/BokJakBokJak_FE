export const CHAT_ROUTE_PATTERNS = {
  list: '/chat',
  room: '/chat/:roomId',
  menu: '/chat/:roomId/menu',
} as const

export const CHAT_ROUTES = {
  list: CHAT_ROUTE_PATTERNS.list,
  room: (roomId: string) => `/chat/${roomId}`,
  menu: (roomId: string) => `/chat/${roomId}/menu`,
}

/** Router state for the roommate screens, so their back buttons return to the chat room. */
export function fromChatState(roomId: string) {
  return { from: 'chat', roomId } as const
}

/** History state can hold anything, so only a chat state with a room id counts. */
export function getChatReturnPath(state: unknown) {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    state.from === 'chat' &&
    'roomId' in state &&
    typeof state.roomId === 'string'
  ) {
    return CHAT_ROUTES.room(state.roomId)
  }
  return null
}
