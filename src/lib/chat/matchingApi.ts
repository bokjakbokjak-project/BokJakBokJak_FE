import { apiRequest } from '../api/apiClient'
import { categoriesFromCodes } from '../api/categoryCodes'
import {
  asObject,
  readArray,
  readBoolean,
  readEnum,
  readNullableEnum,
  readNullableNumber,
  readNullableString,
  readNumber,
  readString,
  readStringArray,
  type JsonObject,
} from '../api/parse'
import { getSessionGeneration } from '../auth/tokenStore'
import type { CategoryId } from '../onboarding/categories'

/**
 * The chat room APIs (채희 spec 7.6 to 7.13): rooms, messages and the matching state. Fields
 * arrive in snake_case and become the camelCase models below at this boundary.
 */

export const MATCHING_STATUSES = ['CHATTING', 'CONFIRMED', 'ENDED'] as const
export type MatchingStatus = (typeof MATCHING_STATUSES)[number]

export const END_REASONS = ['USER_ENDED', 'PARTNER_MATCHED'] as const
export type EndReason = (typeof END_REASONS)[number]

export const AGENDA_STATUSES = ['WAITING', 'DISCUSSING', 'DECIDED'] as const
export type AgendaStatus = (typeof AGENDA_STATUSES)[number]

export const MESSAGE_TYPES = ['USER', 'AI', 'SYSTEM'] as const
export type MessageType = (typeof MESSAGE_TYPES)[number]

export type Partner = {
  userId: number
  nickname: string
  priorities: (CategoryId | undefined)[]
}

export type RoomSummary = {
  matchingId: number
  partner: Partner
  status: MatchingStatus
  /** Null while the room has no message. */
  lastMessage: string | null
  lastMessageAt: string | null
}

export type Agenda = {
  agendaId: number
  seq: number
  title: string
  content: string
  status: AgendaStatus
  /** Shown as `결정 완료: …` once decided; null shows `결정 완료` alone. */
  ruleSummary: string | null
}

export type Room = {
  matchingId: number
  status: MatchingStatus
  /** Only for an ENDED room. */
  endReason: EndReason | null
  partner: Partner & { department: string }
  /** Empty while the AI prepares them. */
  agendas: Agenda[]
  myConfirmed: boolean
  partnerConfirmed: boolean
}

export type Message = {
  messageId: number
  type: MessageType
  /** Null for AI and SYSTEM messages. */
  senderId: number | null
  content: string
  agendaId: number | null
  createdAt: string
}

function parsePartner(value: unknown): Partner {
  const partner = asObject(value, 'partner')
  return {
    userId: readNumber(partner, 'user_id'),
    nickname: readString(partner, 'nickname'),
    priorities: categoriesFromCodes(readStringArray(partner, 'top_categories')),
  }
}

function parseAgenda(value: unknown): Agenda {
  const agenda = asObject(value, 'agendas')
  return {
    agendaId: readNumber(agenda, 'agenda_id'),
    seq: readNumber(agenda, 'seq'),
    title: readString(agenda, 'title'),
    content: readString(agenda, 'content'),
    status: readEnum(agenda, 'status', AGENDA_STATUSES),
    ruleSummary: readNullableString(agenda, 'rule_summary'),
  }
}

export function parseMessage(value: unknown): Message {
  const message = asObject(value, 'messages')
  return {
    messageId: readNumber(message, 'message_id'),
    type: readEnum(message, 'type', MESSAGE_TYPES),
    senderId: readNullableNumber(message, 'sender_id'),
    content: readString(message, 'content'),
    agendaId: readNullableNumber(message, 'agenda_id'),
    createdAt: readString(message, 'created_at'),
  }
}

function parseRoom(data: JsonObject): Room {
  const partner = asObject(data.partner, 'partner')
  return {
    matchingId: readNumber(data, 'matching_id'),
    status: readEnum(data, 'status', MATCHING_STATUSES),
    endReason: readNullableEnum(data, 'end_reason', END_REASONS),
    partner: {
      ...parsePartner(partner),
      department: readNullableString(partner, 'department') ?? '',
    },
    agendas: readArray(data, 'agendas')
      .map(parseAgenda)
      .sort((a, b) => a.seq - b.seq),
    myConfirmed: readBoolean(data, 'my_confirmed'),
    partnerConfirmed: readBoolean(data, 'partner_confirmed'),
  }
}

/** CHATTING and CONFIRMED rooms, latest message first (spec 7.6). */
export async function listMyRooms(
  signal?: AbortSignal,
): Promise<RoomSummary[]> {
  const data = asObject(await apiRequest('/api/matchings/me', { signal }))
  return readArray(data, 'rooms').map((value) => {
    const room = asObject(value, 'rooms')
    return {
      matchingId: readNumber(room, 'matching_id'),
      partner: parsePartner(room.partner),
      status: readEnum(room, 'status', MATCHING_STATUSES),
      lastMessage: readNullableString(room, 'last_message'),
      lastMessageAt: readNullableString(room, 'last_message_at'),
    }
  })
}

export async function getRoom(
  matchingId: number,
  signal?: AbortSignal,
): Promise<Room> {
  return parseRoom(
    asObject(await apiRequest(`/api/matchings/${matchingId}`, { signal })),
  )
}

const MESSAGES_PAGE_SIZE = 30
const NEW_MESSAGES_SIZE = 50

/**
 * The latest messages without `beforeId`, or the ones before it, oldest first (spec 7.8).
 */
export async function getMessages(
  matchingId: number,
  options: { beforeId?: number; signal?: AbortSignal } = {},
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const query = new URLSearchParams({ size: String(MESSAGES_PAGE_SIZE) })
  if (options.beforeId !== undefined) {
    query.set('before_id', String(options.beforeId))
  }
  const data = asObject(
    await apiRequest(`/api/matchings/${matchingId}/messages?${query}`, {
      signal: options.signal,
    }),
  )
  return {
    messages: readArray(data, 'messages').map(parseMessage),
    hasMore: readBoolean(data, 'has_more'),
  }
}

/** Messages after `afterId`, oldest first, for polling (spec 7.9). */
export async function getNewMessages(
  matchingId: number,
  afterId: number,
  signal?: AbortSignal,
): Promise<Message[]> {
  const query = new URLSearchParams({
    after_id: String(afterId),
    size: String(NEW_MESSAGES_SIZE),
  })
  const data = asObject(
    await apiRequest(`/api/matchings/${matchingId}/messages?${query}`, {
      signal,
    }),
  )
  return readArray(data, 'messages').map(parseMessage)
}

/** 1 to 500 characters, not only spaces (spec 7.10). */
export const MESSAGE_MAX_LENGTH = 500

export async function sendMessage(
  matchingId: number,
  content: string,
): Promise<Message> {
  return parseMessage(
    await apiRequest(`/api/matchings/${matchingId}/messages`, {
      method: 'POST',
      body: { content },
    }),
  )
}

/** One person's decision is enough. `allDecided` opens the final match dialog (spec 7.11). */
export async function decideAgenda(
  matchingId: number,
  agendaId: number,
): Promise<{ allDecided: boolean }> {
  const data = asObject(
    await apiRequest(
      `/api/matchings/${matchingId}/agendas/${agendaId}/decide`,
      { method: 'PATCH' },
    ),
  )
  return { allDecided: readBoolean(data, 'all_decided') }
}

/** Ends the room for good; the two cannot request each other again (spec 7.12). */
export async function endMatching(matchingId: number): Promise<void> {
  await apiRequest(`/api/matchings/${matchingId}/end`, { method: 'PATCH' })
}

/** The match is final only when the status comes back CONFIRMED (spec 7.13). */
export async function confirmMatching(matchingId: number): Promise<{
  status: MatchingStatus
  myConfirmed: boolean
  partnerConfirmed: boolean
}> {
  const data = asObject(
    await apiRequest(`/api/matchings/${matchingId}/confirm`, {
      method: 'PATCH',
    }),
  )
  return {
    status: readEnum(data, 'status', MATCHING_STATUSES),
    myConfirmed: readBoolean(data, 'my_confirmed'),
    partnerConfirmed: readBoolean(data, 'partner_confirmed'),
  }
}

let myUserId: { generation: number; id: Promise<number> } | null = null

/**
 * The signed-in user's id, to tell my messages from the partner's by `sender_id`. The sign-in
 * response has it, but after a reload only the refresh token is left, so it comes from A's
 * `GET /api/me/profile` once per session.
 */
export function getMyUserId(): Promise<number> {
  const generation = getSessionGeneration()
  if (myUserId?.generation !== generation) {
    const id = apiRequest('/api/me/profile').then((value) =>
      readNumber(asObject(value), 'user_id'),
    )
    myUserId = { generation, id }
    // A failure is not kept, so the next room tries again.
    id.catch(() => {
      if (myUserId?.id === id) myUserId = null
    })
  }
  return myUserId.id
}
