import { chatApi } from '../chat/chatApi'
import { canUseTemporaryFlow } from '../onboarding/demoMode'

export type ChatRequestResult = {
  /** The chat room with this candidate, or `null` when there is none yet. */
  roomId: string | null
}

export type ChatRequestApi = {
  requestChat: (candidateId: string) => Promise<ChatRequestResult>
}

/**
 * Stand-in until the chat request API exists (OPEN_QUESTIONS RM-3). It sends nothing: it only
 * looks for a sample chat room with this candidate, so `대화창 이동` can open that room.
 */
const temporaryChatRequestApi: ChatRequestApi = {
  requestChat: async (candidateId) => {
    const rooms = await chatApi.listRooms()
    const room = rooms.find((item) => item.candidateId === candidateId)
    return { roomId: room?.id ?? null }
  },
}

/**
 * Connection point for the real request. Without a server there is nothing to send, so outside
 * development and demo mode this returns `null` and the button stays disabled instead of showing
 * a request that was never made.
 */
export function getChatRequestApi(): ChatRequestApi | null {
  return canUseTemporaryFlow() ? temporaryChatRequestApi : null
}
