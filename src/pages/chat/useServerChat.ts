import { useCallback, useEffect, useRef, useState } from 'react'
import { errorCode } from '../../lib/api/errorText'
import {
  confirmMatching,
  decideAgenda,
  endMatching,
  getMessages,
  getMyUserId,
  getNewMessages,
  getRoom,
  sendMessage,
  type Message,
  type Room,
} from '../../lib/chat/matchingApi'

/** The spec asks for every 2 to 3 seconds (채희 spec 4.4). */
export const POLL_INTERVAL_MS = 2500

/**
 * The partner's final choice sends no SYSTEM message the spec names, so the room is also read
 * again every few polls while it is open (spec 9.6, a client choice). Agendas still being
 * prepared are read on every poll instead.
 */
const ROOM_REFRESH_EVERY = 4

/** Codes after which trying again cannot help: the user is not in this room or it is gone. */
const FINAL_CODES = new Set(['MATCHING_FORBIDDEN', 'MATCHING_NOT_FOUND'])

/** Codes that mean the room changed under the user, so it is read again (spec 5). */
const STALE_CODES = new Set(['INVALID_MATCHING_STATUS', 'AGENDA_NOT_STARTED'])

export type ServerChatState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown; canRetry: boolean }
  | {
      status: 'ready'
      room: Room
      /** Oldest first, one per `message_id`. */
      messages: Message[]
      myUserId: number
      hasMore: boolean
    }

/** Adds messages by `message_id`: a message from the send response and a poll shows once. */
export function mergeMessages(current: Message[], incoming: Message[]) {
  if (incoming.length === 0) return current
  const byId = new Map(current.map((message) => [message.messageId, message]))
  for (const message of incoming) byId.set(message.messageId, message)
  return [...byId.values()].sort((a, b) => a.messageId - b.messageId)
}

const maxId = (messages: Message[], from: number) =>
  messages.reduce((max, message) => Math.max(max, message.messageId), from)

/**
 * One server chat room: the room, its messages and polling (채희 spec 4.4, 7.7 to 7.13).
 *
 * - The first read takes the latest messages without `before_id`. The poll cursor starts at
 *   their largest `message_id`, or 0 for an empty room (Swagger's `after_id` minimum is 0; the
 *   spec leaves it open, 9.4).
 * - Polls run one at a time, `POLL_INTERVAL_MS` after the last one ends. Only a poll moves the
 *   cursor, never a send response, so messages that arrive meanwhile are not skipped.
 * - A SYSTEM message, or agendas still being prepared, reads the room again.
 * - Polling stops when the room is ENDED or CONFIRMED, and on unmount or a room change.
 */
export function useServerChat(matchingId: number) {
  const [state, setState] = useState<ServerChatState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const cursorRef = useRef(0)
  const stateRef = useRef(state)
  const aliveRef = useRef(true)

  const apply = useCallback(
    (update: (current: ServerChatState) => ServerChatState) => {
      if (!aliveRef.current) return
      const next = update(stateRef.current)
      stateRef.current = next
      setState(next)
    },
    [],
  )

  const setRoom = useCallback(
    (room: Room) =>
      apply((current) =>
        current.status === 'ready' ? { ...current, room } : current,
      ),
    [apply],
  )

  const reloadRoom = useCallback(async () => {
    try {
      setRoom(await getRoom(matchingId))
    } catch {
      // The next poll or action tries again; the screen keeps the last known room.
    }
  }, [matchingId, setRoom])

  // The first read, again on retry.
  useEffect(() => {
    aliveRef.current = true
    const controller = new AbortController()
    const { signal } = controller
    stateRef.current = { status: 'loading' }
    Promise.all([
      getRoom(matchingId, signal),
      getMessages(matchingId, { signal }),
      getMyUserId(),
    ]).then(
      ([room, { messages, hasMore }, myUserId]) => {
        if (signal.aborted) return
        cursorRef.current = maxId(messages, 0)
        apply(() => ({
          status: 'ready',
          room,
          messages: mergeMessages([], messages),
          myUserId,
          hasMore,
        }))
      },
      (error: unknown) => {
        if (signal.aborted) return
        apply(() => ({
          status: 'error',
          error,
          canRetry: !FINAL_CODES.has(errorCode(error) ?? ''),
        }))
      },
    )
    return () => {
      aliveRef.current = false
      controller.abort()
    }
  }, [matchingId, attempt, apply])

  // Polling while the room is CHATTING. The timer chain is restarted only by the status.
  const isChatting =
    state.status === 'ready' && state.room.status === 'CHATTING'
  useEffect(() => {
    if (!isChatting) return
    const controller = new AbortController()
    const { signal } = controller
    let timer: ReturnType<typeof setTimeout>
    let polls = 0

    const poll = async () => {
      polls += 1
      try {
        const incoming = await getNewMessages(
          matchingId,
          cursorRef.current,
          signal,
        )
        if (signal.aborted) return
        cursorRef.current = maxId(incoming, cursorRef.current)
        apply((current) =>
          current.status === 'ready'
            ? {
                ...current,
                messages: mergeMessages(current.messages, incoming),
              }
            : current,
        )
        const current = stateRef.current
        const preparing =
          current.status === 'ready' && current.room.agendas.length === 0
        if (
          incoming.some((message) => message.type === 'SYSTEM') ||
          preparing ||
          polls % ROOM_REFRESH_EVERY === 0
        ) {
          const room = await getRoom(matchingId, signal)
          if (!signal.aborted) setRoom(room)
        }
      } catch {
        // A failed poll is tried again on the next tick. The session flow handles a 401.
      }
      if (!signal.aborted) timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [isChatting, matchingId, apply, setRoom])

  const retry = useCallback(() => setAttempt((count) => count + 1), [])

  /** Reads the room again after a refused action, then passes the error on. */
  const syncOnStale = useCallback(
    async (error: unknown): Promise<never> => {
      if (STALE_CODES.has(errorCode(error) ?? '')) await reloadRoom()
      throw error
    },
    [reloadRoom],
  )

  /** Shows the sent message at once. The cursor stays where the polls left it. */
  const send = useCallback(
    async (content: string) => {
      const message = await sendMessage(matchingId, content).catch(syncOnStale)
      apply((current) =>
        current.status === 'ready'
          ? { ...current, messages: mergeMessages(current.messages, [message]) }
          : current,
      )
    },
    [matchingId, apply, syncOnStale],
  )

  /** Earlier messages before the smallest id, added in front. */
  const loadOlder = useCallback(async () => {
    const current = stateRef.current
    if (current.status !== 'ready' || !current.hasMore) return
    const oldest = current.messages[0]
    const { messages, hasMore } = await getMessages(matchingId, {
      beforeId: oldest?.messageId,
    })
    apply((latest) =>
      latest.status === 'ready'
        ? {
            ...latest,
            messages: mergeMessages(latest.messages, messages),
            hasMore,
          }
        : latest,
    )
  }, [matchingId, apply])

  /** Decides the agenda in discussion, then reads the room. Returns `all_decided`. */
  const decide = useCallback(
    async (agendaId: number) => {
      const { allDecided } = await decideAgenda(matchingId, agendaId).catch(
        syncOnStale,
      )
      await reloadRoom()
      return allDecided
    },
    [matchingId, reloadRoom, syncOnStale],
  )

  /** Records my final choice. The match is final only once the server says CONFIRMED. */
  const confirm = useCallback(async () => {
    const result = await confirmMatching(matchingId).catch(syncOnStale)
    apply((current) =>
      current.status === 'ready'
        ? { ...current, room: { ...current.room, ...result } }
        : current,
    )
    await reloadRoom()
  }, [matchingId, apply, reloadRoom, syncOnStale])

  const end = useCallback(
    () => endMatching(matchingId).catch(syncOnStale),
    [matchingId, syncOnStale],
  )

  return { state, retry, send, loadOlder, decide, confirm, end }
}
