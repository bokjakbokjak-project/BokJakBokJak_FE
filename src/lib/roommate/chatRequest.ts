import { isApiError } from '../api/apiError'
import { isServerMode } from '../api/config'
import { parseId } from '../api/parse'
import { chatApi } from '../chat/chatApi'
import { canUseTemporaryFlow } from '../onboarding/demoMode'
import { requestChat } from './recommendationApi'

export type ChatRequestResult =
  /** A new room. `roomId` is null for the sample flow when the candidate has no sample room. */
  | { outcome: 'sent'; roomId: string | null }
  /** The two already talk (or matched): the server names the room instead (`ALREADY_CHATTING`). */
  | { outcome: 'existing'; roomId: string }

export type ChatRequestApi = {
  requestChat: (candidateId: string) => Promise<ChatRequestResult>
}

/**
 * Sample flow for development and demo mode. It sends nothing: it only looks for a sample chat
 * room with this candidate, so `대화창 이동` can open that room.
 */
const temporaryChatRequestApi: ChatRequestApi = {
  requestChat: async (candidateId) => {
    const rooms = await chatApi.listRooms()
    const room = rooms.find((item) => item.candidateId === candidateId)
    return { outcome: 'sent', roomId: room?.id ?? null }
  },
}

/** `POST /api/matchings` with `receiver_id`, which opens a CHATTING room at once (채희 spec 7.5). */
const serverChatRequestApi: ChatRequestApi = {
  requestChat: async (candidateId) => {
    const receiverId = parseId(candidateId)
    if (receiverId === null) throw new Error('Not a user id.')
    try {
      const { matchingId } = await requestChat(receiverId)
      return { outcome: 'sent', roomId: String(matchingId) }
    } catch (error) {
      // The example sends `matching_id` as a string, so it is checked before it becomes a route.
      if (isApiError(error) && error.code === 'ALREADY_CHATTING') {
        const roomId = parseId(error.fieldErrors.matching_id)
        if (roomId !== null)
          return { outcome: 'existing', roomId: String(roomId) }
      }
      throw error
    }
  },
}

/**
 * The server request in server mode, and the sample flow in development and demo mode.
 * Otherwise there is nothing to send, so this returns `null` and the button stays disabled
 * instead of showing a request that was never made.
 */
export function getChatRequestApi(): ChatRequestApi | null {
  if (isServerMode()) return serverChatRequestApi
  return canUseTemporaryFlow() ? temporaryChatRequestApi : null
}
