import { useEffect, useState } from 'react'
import { usesServerData } from '../userTest/experience'
import { getSessionGeneration } from '../auth/tokenStore'
import { listMyRooms, type RoomSummary } from '../chat/matchingApi'
import { useExperienceSession } from '../experience/session'

export type MatchStatus = 'before' | 'matched'

/**
 * Sample mode has no matching data, so the home always starts before a match. Viewing a
 * candidate must not change this.
 */
export function getMatchStatus(): MatchStatus {
  return 'before'
}

/**
 * Matched only when the server says a room is CONFIRMED, which needs both final choices (채희
 * spec 7.13). A chat request, agendas in discussion, or only my own final choice stay `before`.
 */
export function matchStatusFromRooms(rooms: RoomSummary[]): MatchStatus {
  return rooms.some((room) => room.status === 'CONFIRMED')
    ? 'matched'
    : 'before'
}

/** The last answer in this session, so coming back to the home shows it at once. */
let known: { generation: number; status: MatchStatus } | null = null

function knownStatus(): MatchStatus | null {
  return known?.generation === getSessionGeneration() ? known.status : null
}

/**
 * The home's match status.
 *
 * - Server mode asks `GET /api/matchings/me` each time the home opens. Until the first answer of
 *   a session it returns `null` (checking), so neither copy shows by mistake. Later visits start
 *   from the last answer and follow the new one, so a match that ends goes back to `before`.
 * - A failed read keeps the last answer, or `before` when there is none.
 * - Sample mode and a fixed `preview` (the dev preview route) send nothing.
 */
export function useMatchStatus(preview?: MatchStatus): MatchStatus | null {
  const isServer = usesServerData() && preview === undefined
  const [status, setStatus] = useState<MatchStatus | null>(knownStatus)
  // The experience chat's match (experience mode, or a user test tester): the home follows the
  // chat that finished it, but it is never a match on the server.
  const experienceMatched = useExperienceSession()?.matched != null

  useEffect(() => {
    if (!isServer) return
    const controller = new AbortController()
    const generation = getSessionGeneration()
    listMyRooms(controller.signal).then(
      (rooms) => {
        // A late answer for an earlier session never reaches the new one.
        if (controller.signal.aborted || getSessionGeneration() !== generation)
          return
        const next = matchStatusFromRooms(rooms)
        known = { generation, status: next }
        setStatus(next)
      },
      () => {
        if (controller.signal.aborted) return
        setStatus((current) => current ?? 'before')
      },
    )
    return () => controller.abort()
  }, [isServer])

  if (preview !== undefined) return preview
  if (experienceMatched) return 'matched'
  return isServer ? status : getMatchStatus()
}
