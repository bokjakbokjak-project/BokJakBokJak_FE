import { Navigate, useParams } from 'react-router'
import { CHAT_ROUTES } from '../../lib/chat/routes'

/**
 * The menu screen (Figma 1349:18921) was replaced by the exit icon in the room, and its
 * `대화방에서 나가기` duplicated the back button (QA 8). Old links land in the room.
 */
export default function ChatMenuPage() {
  const { roomId } = useParams()
  return (
    <Navigate
      to={roomId ? CHAT_ROUTES.room(roomId) : CHAT_ROUTES.list}
      replace
    />
  )
}
