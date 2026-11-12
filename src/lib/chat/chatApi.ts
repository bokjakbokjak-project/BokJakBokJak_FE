import { canUseTemporaryFlow } from '../onboarding/demoMode'
import { mockChatApi } from './chatApi.mock'

export type ChatStatus = 'active' | 'matched' | 'ended'

/**
 * Keys of the characters exported from Figma. Real rooms should show each user's own
 * character, which is not decided yet (chat OPEN_QUESTIONS CH-3).
 */
export type ChatAvatar =
  'blue-cap' | 'sleep-mask' | 'sleep-mask-white' | 'yellow-hat'

export type ChatItem =
  /** The chatbot's opening card with the agendas it picked (Figma 1715:38127). */
  | { id: string; kind: 'intro'; agendas: string[] }
  | { id: string; kind: 'agenda'; title: string; prompt: string }
  | { id: string; kind: 'agreement'; title: string; summary: string }
  | { id: string; kind: 'message'; from: 'me' | 'partner'; text: string }
  | { id: string; kind: 'left' }

export type ChatRoom = {
  id: string
  partnerName: string
  /** The partner in the roommate data, for the profile screens. Missing when there is none. */
  candidateId?: string
  matchRate: number
  /** Display text such as 오늘. The server format is not agreed. */
  updatedAt: string
  status: ChatStatus
  listAvatar: ChatAvatar
  chatAvatar: ChatAvatar
  /** Whether I pressed 다음 안건 진행하기 for the current agenda. */
  agendaVoted: boolean
  /** Whether I pressed 매칭확정하기. The match is final once both did (Figma 1858:18674). */
  matchVoted: boolean
  /** Partner messages I have not read yet, shown as the red count on the list (Figma 1574:38000). */
  unreadCount: number
  items: ChatItem[]
}

/** Contract to agree with the backend (chat OPEN_QUESTIONS CH-1). */
export type ChatApi = {
  listRooms: () => Promise<ChatRoom[]>
  getRoom: (id: string) => Promise<ChatRoom | null>
  sendMessage: (id: string, text: string) => Promise<ChatRoom>
  setAgendaVote: (id: string, voted: boolean) => Promise<ChatRoom>
  setMatchVote: (id: string, voted: boolean) => Promise<ChatRoom>
  endRoom: (id: string) => Promise<void>
  /** Marks the room's messages as read, when the room is opened. */
  markRead: (id: string) => Promise<void>
}

const notConnected = async (): Promise<never> => {
  throw new Error('The chat API is not connected yet.')
}

// Connection point for the real API. There is no server yet, so there are no rooms and every
// change fails instead of pretending that it was sent. Use it in place of the Production sample
// below once the server exists.
export const serverChatApi: ChatApi = {
  listRooms: async () => [],
  getRoom: async () => null,
  sendMessage: notConnected,
  setAgendaVote: notConnected,
  setMatchVote: notConnected,
  endRoom: notConnected,
  markRead: notConnected,
}

/**
 * Rooms that Production shows until the chat server exists, so the deployed app is not empty
 * (requested 2026-11-12, chat OPEN_QUESTIONS CH-1). The screens mark them as samples, and changes
 * stay in memory like the development data.
 */
export const PRODUCTION_SAMPLE_ROOM_IDS: readonly string[] = [
  'seoyujeong',
  'parkjimin',
]

const productionSampleChatApi: ChatApi = {
  ...mockChatApi,
  listRooms: async () =>
    (await mockChatApi.listRooms()).filter(({ id }) =>
      PRODUCTION_SAMPLE_ROOM_IDS.includes(id),
    ),
  getRoom: async (id) =>
    PRODUCTION_SAMPLE_ROOM_IDS.includes(id) ? mockChatApi.getRoom(id) : null,
}

/** True on Production, where the chat screens show the sample notice. */
export const isChatSampleOnly = !canUseTemporaryFlow()

export const chatApi: ChatApi = isChatSampleOnly
  ? productionSampleChatApi
  : mockChatApi
