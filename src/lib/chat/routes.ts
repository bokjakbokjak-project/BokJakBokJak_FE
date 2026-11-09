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

/** A single path segment, so a bad state cannot point at another route such as a room menu. */
const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]+$/

/** History state can hold anything, so only a chat state with a room id counts. */
export function getChatReturnPath(state: unknown) {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    state.from === 'chat' &&
    'roomId' in state &&
    typeof state.roomId === 'string' &&
    ROOM_ID_PATTERN.test(state.roomId)
  ) {
    return CHAT_ROUTES.room(state.roomId)
  }
  return null
}
