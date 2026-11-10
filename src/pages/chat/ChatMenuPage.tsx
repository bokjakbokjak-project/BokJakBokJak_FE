import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import backArrow from '../../assets/question/back-arrow-brown.svg'
import { chatApi } from '../../lib/chat/chatApi'
import { CHAT_ROUTES } from '../../lib/chat/routes'
import { CHAT_AVATARS, MY_CHAT_AVATAR } from './chatAvatars'
import { useChatRoom } from './useChatRoom'

/** Figma 1349:18921. */
export default function ChatMenuPage() {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const { room } = useChatRoom(roomId)
  const [isPending, setIsPending] = useState(false)
  const [hasError, setHasError] = useState(false)

  if (room === null) return <Navigate to={CHAT_ROUTES.list} replace />
  if (!room) return null

  // Leaving only closes the room screen. Ending changes the match, so it goes to the server.
  // The difference between the two is not confirmed (chat OPEN_QUESTIONS CH-2).
  const end = async () => {
    setIsPending(true)
    setHasError(false)
    try {
      await chatApi.endRoom(room.id)
      navigate(CHAT_ROUTES.list)
    } catch {
      setHasError(true)
      setIsPending(false)
    }
  }

  const canEnd = room.status !== 'ended' && !isPending

  return (
    <div className="flex flex-1 flex-col bg-brand-beige5 pt-[max(0px,calc(47px-env(safe-area-inset-top)))]">
      <header className="relative flex h-14 shrink-0 items-center justify-center">
        <button
          type="button"
          aria-label="채팅방으로 돌아가기"
          className="absolute top-3.5 left-6 flex size-7 items-center justify-center rounded-full border-[1.5px] border-transparent transition-colors hover:border-question-outline hover:bg-brand-beige1 focus-visible:border-question-outline focus-visible:bg-brand-beige1"
          onClick={() => navigate(CHAT_ROUTES.room(room.id))}
        >
          <img src={backArrow} alt="" />
        </button>
        <h1 className="text-[20px] leading-[1.5] font-bold text-brand-brown1">
          채팅방
        </h1>
      </header>

      <div className="relative mx-auto mt-[30px] h-[106px] w-[114px]">
        <img
          src={MY_CHAT_AVATAR}
          alt=""
          className="absolute top-0 right-0 size-[68px]"
        />
        <img
          src={CHAT_AVATARS[room.chatAvatar]}
          alt=""
          className="absolute bottom-0 left-0 size-[68px]"
        />
      </div>
      <p className="mt-[18px] text-center text-[18px] leading-[1.5] font-medium tracking-[0.36px] text-black">
        <span className="font-bold">{room.partnerName}</span>님과의 채팅
      </p>

      <div className="mx-6 mt-[41px] overflow-hidden rounded-[10px] bg-brand-beige4 text-[18px] leading-[1.5] font-medium tracking-[0.36px]">
        <button
          type="button"
          className="flex h-[52px] w-full items-start px-[13px] pt-[15px] text-left text-black"
          onClick={() => navigate(CHAT_ROUTES.list)}
        >
          대화방에서 나가기
        </button>
        <div className="mx-2 h-0.5 bg-brand-beige3" />
        <button
          type="button"
          disabled={!canEnd}
          className="flex h-[52px] w-full items-start px-[13px] pt-3 text-left text-chat-danger disabled:opacity-40"
          onClick={end}
        >
          채팅방 종료하기
        </button>
      </div>
      {hasError && (
        <p
          role="alert"
          className="mx-6 mt-3 text-center text-[12px] leading-[1.5] text-chat-danger"
        >
          요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
      )}
    </div>
  )
}
