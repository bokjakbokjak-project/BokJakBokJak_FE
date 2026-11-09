import { useEffect, useState } from 'react'
import { chatApi, type ChatRoom } from '../../lib/chat/chatApi'

/** Loads one room. `room` is undefined while loading and null when there is no such room. */
export function useChatRoom(roomId: string | undefined) {
  const [loaded, setLoaded] = useState<{
    id: string
    room: ChatRoom | null
  } | null>(null)

  useEffect(() => {
    if (!roomId) return
    let active = true
    chatApi
      .getRoom(roomId)
      .catch(() => null)
      .then((room) => {
        if (active) setLoaded({ id: roomId, room })
      })
    return () => {
      active = false
    }
  }, [roomId])

  const room = roomId && loaded?.id === roomId ? loaded.room : undefined
  const update = (next: ChatRoom) => setLoaded({ id: next.id, room: next })

  return { room: roomId ? room : null, update }
}
