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
  items: ChatItem[]
}

/** Contract to agree with the backend (chat OPEN_QUESTIONS CH-1). */
export type ChatApi = {
  listRooms: () => Promise<ChatRoom[]>
  getRoom: (id: string) => Promise<ChatRoom | null>
  sendMessage: (id: string, text: string) => Promise<ChatRoom>
  setAgendaVote: (id: string, voted: boolean) => Promise<ChatRoom>
  endRoom: (id: string) => Promise<void>
}

const notConnected = async (): Promise<never> => {
  throw new Error('The chat API is not connected yet.')
}

// Connection point for the real API. There is no server yet, so there are no rooms and every
// change fails instead of pretending that it was sent.
const serverChatApi: ChatApi = {
  listRooms: async () => [],
  getRoom: async () => null,
  sendMessage: notConnected,
  setAgendaVote: notConnected,
  endRoom: notConnected,
}

export const chatApi: ChatApi = canUseTemporaryFlow()
  ? mockChatApi
  : serverChatApi
