import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { CHAT_ROUTES } from '../../lib/chat/routes'
import { getChatRequestApi } from '../../lib/roommate/chatRequest'
import ChatRequestBar from './ChatRequestBar'
import ChatRequestDialog from './ChatRequestDialog'

type RequestState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'sent'; roomId: string | null }

/**
 * `대화 요청하기` with the sent dialog (Figma 1686:17517), for the match analysis and the detail
 * profile. `대화창 이동` opens the candidate's chat room, or the chat list when there is none
 * yet (temporary rule until the chat request API decides it, OPEN_QUESTIONS RM-3).
 */
export default function ChatRequestFooter({
  candidateId,
}: {
  candidateId: string
}) {
  const navigate = useNavigate()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [request, setRequest] = useState<RequestState>({ status: 'idle' })
  const api = getChatRequestApi()

  const send = async () => {
    if (!api) return
    setRequest({ status: 'pending' })
    try {
      const { roomId } = await api.requestChat(candidateId)
      setRequest({ status: 'sent', roomId })
    } catch {
      // Nothing was sent, so the dialog is not shown and the button can be used again.
      setRequest({ status: 'idle' })
    }
  }

  return (
    <>
      <ChatRequestBar
        buttonRef={buttonRef}
        onRequest={api && request.status === 'idle' ? send : undefined}
      />
      {request.status === 'sent' && (
        <ChatRequestDialog
          triggerRef={buttonRef}
          onClose={() => setRequest({ status: 'idle' })}
          onOpenChat={() =>
            navigate(
              request.roomId
                ? CHAT_ROUTES.room(request.roomId)
                : CHAT_ROUTES.list,
            )
          }
        />
      )}
    </>
  )
}
