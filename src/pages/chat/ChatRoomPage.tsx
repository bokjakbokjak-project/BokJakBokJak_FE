import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import menuIcon from '../../assets/chat/menu.svg'
import backArrow from '../../assets/question/back-arrow-brown.svg'
import sendActive from '../../assets/chat/send-active.svg'
import sendIdle from '../../assets/chat/send-idle.svg'
import ChoiceDialog from '../../components/dialog/ChoiceDialog'
import { chatApi, type ChatItem, type ChatRoom } from '../../lib/chat/chatApi'
import { CHAT_ROUTES, fromChatState } from '../../lib/chat/routes'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'
import { AI_AVATAR, CHAT_AVATARS, MY_CHAT_AVATAR } from './chatAvatars'
import { useChatRoom } from './useChatRoom'

type Sender = 'ai' | 'me' | 'partner' | 'system'

const senderOf = (item: ChatItem): Sender =>
  item.kind === 'message' ? item.from : item.kind === 'left' ? 'system' : 'ai'

// Not in Figma. Shown when the server rejects a change (chat OPEN_QUESTIONS DE-C1).
const ERROR_TEXT = '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'

function AiCard({
  title,
  body,
  status,
}: {
  title: string
  body: string
  status: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[22px] bg-chat-agenda p-4 text-gray-black">
      <p className="text-[15px] leading-[1.5] font-bold">{title}</p>
      <p className="text-[13px] leading-[1.5] font-medium break-keep whitespace-pre-line">
        {body}
      </p>
      <p className="text-[12px] leading-[1.5] font-medium text-chat-muted">
        {status}
      </p>
    </div>
  )
}

function ChatItemView({ item, room }: { item: ChatItem; room: ChatRoom }) {
  switch (item.kind) {
    case 'agenda':
      return (
        <AiCard
          title={item.title}
          body={item.prompt}
          status="아직 정하지 않았어요"
        />
      )
    case 'agreement':
      return (
        <AiCard title={item.title} body={item.summary} status="확정 완료" />
      )
    case 'left':
      return (
        <p className="self-center rounded-[6px] bg-white px-1.5 text-[12px] leading-[1.5] font-medium tracking-[-0.12px] text-black">
          <span className="text-[11px] tracking-normal underline">
            {room.partnerName}
          </span>{' '}
          님이 방을 나갔습니다.
        </p>
      )
    case 'message':
      return (
        <p
          className={`max-w-[300px] rounded-xl px-2.5 py-1.5 leading-[1.5] font-medium break-keep whitespace-pre-line text-gray-black ${item.from === 'me' ? 'self-end bg-brand-beige3 text-[14px]' : 'self-start bg-white text-[15px]'}`}
        >
          {item.text}
        </p>
      )
  }
}

function SenderAvatar({ sender, room }: { sender: Sender; room: ChatRoom }) {
  if (sender === 'ai') {
    return (
      <>
        <img src={AI_AVATAR} alt="" className="h-[53.5px] w-[62.5px]" />
        <span className="sr-only">AI</span>
      </>
    )
  }
  if (sender === 'me') {
    return (
      <>
        <img src={MY_CHAT_AVATAR} alt="" className="size-[52px] self-end" />
        <span className="sr-only">나</span>
      </>
    )
  }
  const avatar = (
    <img src={CHAT_AVATARS[room.chatAvatar]} alt="" className="size-[52px]" />
  )
  if (!room.candidateId) {
    return (
      <>
        <span className="self-start">{avatar}</span>
        <span className="sr-only">{room.partnerName}님</span>
      </>
    )
  }
  return (
    <Link
      to={ROOMMATE_ROUTES.analysis(room.candidateId)}
      state={fromChatState(room.id)}
      aria-label={`${room.partnerName}님 프로필 보기`}
      className="self-start rounded-[20px]"
    >
      {avatar}
    </Link>
  )
}

/** Figma 988:19036, 988:16735, 940:19880 and 1236:14142. */
export default function ChatRoomPage() {
  const { roomId } = useParams()
  const { room, update } = useChatRoom(roomId)
  const [draft, setDraft] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [hasError, setHasError] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)
  const voteRef = useRef<HTMLButtonElement>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  // Opening the room reads it. Without a server this fails quietly and the count stays.
  const openedRoomId = room?.id
  useEffect(() => {
    if (openedRoomId) chatApi.markRead(openedRoomId).catch(() => {})
  }, [openedRoomId])

  const itemCount = room?.items.length ?? 0
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [itemCount])

  if (room === null) return <Navigate to={CHAT_ROUTES.list} replace />
  if (!room) return null

  const run = async (action: () => Promise<ChatRoom>) => {
    setIsPending(true)
    setHasError(false)
    try {
      update(await action())
      return true
    } catch {
      setHasError(true)
      return false
    } finally {
      setIsPending(false)
    }
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || isPending) return
    if (await run(() => chatApi.sendMessage(room.id, text))) setDraft('')
  }

  const isEnded = room.status === 'ended'
  const canSend = draft.trim().length > 0 && !isPending && !isEnded

  return (
    <div className="flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col bg-brand-beige5 md:h-auto md:min-h-0 md:flex-1">
      <header className="shrink-0 pt-[max(0px,calc(47px-env(safe-area-inset-top)))]">
        {/* Figma has no back button here. It was added on request, in the same style as the
            other screens, and returns to the chat list. */}
        <div className="flex h-14 items-center justify-between pr-[26px] pl-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              to={CHAT_ROUTES.list}
              aria-label="채팅 목록으로 돌아가기"
              className="flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-transparent transition-colors hover:border-question-outline hover:bg-brand-beige1 focus-visible:border-question-outline focus-visible:bg-brand-beige1"
            >
              <img src={backArrow} alt="" />
            </Link>
            <h1 className="truncate text-[20px] leading-[1.5] font-bold text-gray-black">
              {room.partnerName}님
            </h1>
          </div>
          <Link to={CHAT_ROUTES.menu(room.id)} aria-label="채팅방 메뉴">
            <img src={menuIcon} alt="" className="size-[26px]" />
          </Link>
        </div>
      </header>

      <ol
        ref={listRef}
        aria-label="대화 내용"
        className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-[3px] pb-6"
      >
        {room.items.map((item, index) => {
          const sender = senderOf(item)
          const previous = room.items[index - 1]
          const startsGroup = !previous || senderOf(previous) !== sender
          const showAvatar = startsGroup && sender !== 'system'
          // Figma keeps 16px between messages and 24px around the AI cards and notices.
          const groupGap =
            item.kind === 'message' && previous?.kind === 'message'
              ? 'mt-4'
              : 'mt-6'
          return (
            <li
              key={item.id}
              className={`flex flex-col gap-[9px] ${index === 0 ? '' : startsGroup ? groupGap : 'mt-[9px]'}`}
            >
              {showAvatar && <SenderAvatar sender={sender} room={room} />}
              <ChatItemView item={item} room={room} />
            </li>
          )
        })}
      </ol>

      <footer className="flex shrink-0 flex-col gap-4 px-6 pb-[max(0px,calc(24px-env(safe-area-inset-bottom)))]">
        {room.status === 'active' && (
          <button
            type="button"
            disabled={isPending}
            className={`h-10 self-center rounded-[62px] p-2.5 text-[14px] leading-[1.5] font-semibold ${room.agendaVoted ? 'bg-brand-brown2 text-white' : 'bg-brand-beige4 text-gray-black'}`}
            ref={voteRef}
            // Voting asks first (Figma 1715:38389). Taking the vote back does not (CH-2).
            onClick={() =>
              room.agendaVoted
                ? run(() => chatApi.setAgendaVote(room.id, false))
                : setIsConfirming(true)
            }
          >
            {room.agendaVoted ? '안건 확정 취소하기' : '다음 안건 진행하기'}
          </button>
        )}
        {room.status === 'matched' && (
          <p
            role="status"
            className="flex h-10 items-center self-center rounded-[62px] bg-brand-beige1 p-2.5 text-[14px] leading-[1.5] font-semibold text-chat-badge-text"
          >
            🎉 매칭이 확정되었습니다
          </p>
        )}
        <div>
          {hasError && (
            <p
              role="alert"
              className="mb-2 text-center text-[12px] leading-[1.5] text-chat-danger"
            >
              {ERROR_TEXT}
            </p>
          )}
          <form className="relative" onSubmit={send}>
            <input
              type="text"
              aria-label="메시지 입력"
              placeholder="메세지 입력"
              value={draft}
              disabled={isEnded}
              className="h-[37px] w-full rounded-[20px] border border-gray-100 bg-white pr-11 pl-3 text-[16px] leading-[1.5] text-gray-black outline-none placeholder:text-gray-500 focus-visible:border-brand-brown2 disabled:opacity-60"
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              type="submit"
              aria-label="메시지 보내기"
              disabled={!canSend}
              className="absolute top-1 right-[9px] flex size-7 items-center justify-center"
            >
              <img src={canSend ? sendActive : sendIdle} alt="" />
            </button>
          </form>
        </div>
      </footer>
      {isConfirming && (
        <ChoiceDialog
          title="이대로 확정하시겠습니까?"
          message={
            '안건을 확정하면 다시 수정할 수 없어요\nAI가 다음 안건으로 이동해요'
          }
          cancelLabel="취소하기"
          confirmLabel="확정하기"
          triggerRef={voteRef}
          onCancel={() => setIsConfirming(false)}
          onConfirm={() => {
            setIsConfirming(false)
            run(() => chatApi.setAgendaVote(room.id, true))
          }}
        />
      )}
    </div>
  )
}
