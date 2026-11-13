import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { errorCode, errorText } from '../../lib/api/errorText'
import { CHAT_ROUTES } from '../../lib/chat/routes'
import { getChatRequestApi } from '../../lib/roommate/chatRequest'
import ChoiceDialog from '../dialog/ChoiceDialog'
import ChatRequestBar from './ChatRequestBar'
import ChatRequestDialog from './ChatRequestDialog'

type RequestState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'sent'; roomId: string | null }
  | { status: 'existing'; roomId: string }
  | { status: 'failed'; message: string }

/**
 * Codes that change what the list can offer this candidate (채희 spec 5), so the caller loads
 * the recommendations again.
 */
const STATE_CHANGING_CODES = new Set([
  'TARGET_WITHDRAWN',
  'MATCHING_ENDED_PAIR',
  'ALREADY_MATCHED',
  'TARGET_NOT_ELIGIBLE',
])

/**
 * `대화 요청하기` with the sent dialog (Figma 1686:17517), for the match analysis and the detail
 * profile. `대화창 이동` opens the new room (the response's `matching_id`), or the chat list when
 * the sample flow has none. The button is blocked while a request is out, so it is sent once.
 */
export default function ChatRequestFooter({
  candidateId,
  onChanged,
}: {
  candidateId: string
  /** Called when the request changed the pair's relation, so the list can show it. */
  onChanged?: () => void
}) {
  const navigate = useNavigate()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [request, setRequest] = useState<RequestState>({ status: 'idle' })
  const api = getChatRequestApi()

  const send = async () => {
    if (!api) return
    setRequest({ status: 'pending' })
    try {
      const result = await api.requestChat(candidateId)
      setRequest(
        result.outcome === 'sent'
          ? { status: 'sent', roomId: result.roomId }
          : { status: 'existing', roomId: result.roomId },
      )
      onChanged?.()
    } catch (error) {
      // Nothing was sent, so the sent dialog is not shown and the button can be used again.
      setRequest({ status: 'failed', message: errorText(error) })
      if (STATE_CHANGING_CODES.has(errorCode(error) ?? '')) onChanged?.()
    }
  }

  const close = () => setRequest({ status: 'idle' })

  return (
    <>
      <ChatRequestBar
        buttonRef={buttonRef}
        onRequest={api && request.status === 'idle' ? send : undefined}
      />
      {request.status === 'sent' && (
        <ChatRequestDialog
          triggerRef={buttonRef}
          onClose={close}
          onOpenChat={() =>
            navigate(
              request.roomId
                ? CHAT_ROUTES.room(request.roomId)
                : CHAT_ROUTES.list,
            )
          }
        />
      )}
      {/* Not in Figma: the server's ALREADY_CHATTING names the room the two already have. */}
      {request.status === 'existing' && (
        <ChoiceDialog
          title="이미 대화 중인 상대예요"
          cancelLabel="닫기"
          confirmLabel="대화창 이동"
          triggerRef={buttonRef}
          onCancel={close}
          onConfirm={() => navigate(CHAT_ROUTES.room(request.roomId))}
        />
      )}
      {request.status === 'failed' && (
        <ChoiceDialog
          title={request.message}
          confirmLabel="확인"
          triggerRef={buttonRef}
          onCancel={close}
          onConfirm={close}
        />
      )}
    </>
  )
}
