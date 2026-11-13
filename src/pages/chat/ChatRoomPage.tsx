import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import cardArrow from '../../assets/chat/card-arrow-right.svg'
import cardCheck from '../../assets/chat/card-check-circle.svg'
import exitIcon from '../../assets/chat/exit-round.svg'
import sendIcon from '../../assets/chat/send-round.svg'
import backArrow from '../../assets/question/back-arrow-brown.svg'
import ChoiceDialog from '../../components/dialog/ChoiceDialog'
import {
  chatApi,
  isChatSampleOnly,
  type ChatItem,
  type ChatRoom,
} from '../../lib/chat/chatApi'
import { CHAT_ROUTES, fromChatState } from '../../lib/chat/routes'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'
import { AI_TILE, PARTNER_TILE } from './chatAvatars'
import SampleNotice from './SampleNotice'
import { useChatRoom } from './useChatRoom'

type Sender = 'ai' | 'me' | 'partner' | 'system'

const senderOf = (item: ChatItem): Sender =>
  item.kind === 'message' ? item.from : item.kind === 'left' ? 'system' : 'ai'

// Not in Figma. Shown when the server rejects a change (chat OPEN_QUESTIONS DE-C1).
const ERROR_TEXT = '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'

/** The chatbot's name is a placeholder in Figma (`챗봇이 이름`, `"00"`), chat OPEN_QUESTIONS DE-C6. */
const BOT_NAME = 'AI 챗봇'

const ROUND_BUTTON =
  'relative size-7 shrink-0 rounded-full border-[1.5px] border-transparent transition-colors hover:border-question-outline hover:bg-brand-beige1 focus-visible:border-question-outline focus-visible:bg-brand-beige1'

/** White bubble of the chatbot and the partner, open at the top left (Figma 1715:38156). */
const LEFT_BUBBLE =
  'rounded-tr-[12px] rounded-b-[12px] border border-gray-100 bg-white px-3 py-2 text-gray-black'

/** Figma 1952:40401: a 35px gray row with a 20px icon and the label. */
const CARD_BUTTON =
  'flex h-[35px] w-full items-center justify-center gap-[5px] rounded-[5px] bg-[#f3f3f3] text-[14px] leading-[1.5] font-medium text-gray-black disabled:opacity-60'

/**
 * Text wraps once the text box reaches 258px, the Figma bubble text width (QA 7). Korean words
 * stay whole, and a run without spaces such as a URL still breaks instead of overflowing.
 */
const BUBBLE_TEXT =
  'text-[14px] leading-[1.5] break-keep [overflow-wrap:anywhere] whitespace-pre-wrap'

/** `1 시험기간` in the data reads `1. 시험기간` on the card (Figma 1715:38135). */
const agendaTitle = (title: string) => title.replace(/^(\d+)\s+/, '$1. ')

function AiCard({
  title,
  badge,
  children,
  actions,
}: {
  title: string
  badge?: { text: string; tone: 'open' | 'done' }
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className={`${LEFT_BUBBLE} flex w-[234px] max-w-full flex-col gap-2`}>
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
        <p className="text-[14px] leading-[1.5] font-semibold">{title}</p>
        {badge && (
          <span
            className={`flex h-[21px] shrink-0 items-center rounded-[4px] px-1.5 text-[11px] leading-[1.5] font-semibold ${badge.tone === 'open' ? 'bg-gray-100 text-gray-500' : 'bg-brand-brown1 text-white'}`}
          >
            {badge.text}
          </span>
        )}
      </div>
      <div className="text-[12px] leading-[1.5] break-keep whitespace-pre-line">
        {children}
      </div>
      {actions}
    </div>
  )
}

function ChatItemView({
  item,
  room,
  actions,
}: {
  item: ChatItem
  room: ChatRoom
  actions?: ReactNode
}) {
  switch (item.kind) {
    case 'intro':
      return (
        <AiCard title="안건 조율을 시작할께요!">
          <p>
            안녕하세요 이번 조율을 함께할 {BOT_NAME}입니다! AI 리포트를 기반으로
            함께 조율할 내용을 선정하여 추천해드려요!
          </p>
          <p className="mt-[18px] font-semibold">[ 조율안건 ]</p>
          <ol className="list-inside list-decimal pl-1">
            {item.agendas.map((agenda) => (
              <li key={agenda}>{agenda}</li>
            ))}
          </ol>
        </AiCard>
      )
    case 'agenda':
      return (
        <AiCard
          title={agendaTitle(item.title)}
          badge={{ text: '미정', tone: 'open' }}
          actions={actions}
        >
          {item.prompt}
        </AiCard>
      )
    case 'agreement':
      return (
        <AiCard
          title={agendaTitle(item.title)}
          badge={{ text: '확정', tone: 'done' }}
          actions={actions}
        >
          {item.summary}
        </AiCard>
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
      return item.from === 'me' ? (
        // 258px of text, 16px padding on each side and the 1px border.
        <p
          className={`max-w-[min(292px,100%)] self-end rounded-tl-[12px] rounded-b-[12px] border border-brand-cream3 bg-brand-cream2 px-4 py-2 text-gray-black ${BUBBLE_TEXT}`}
        >
          {item.text}
        </p>
      ) : (
        // 258px of text, 12px padding on each side and the 1px border.
        <p
          className={`${LEFT_BUBBLE} max-w-[min(284px,100%)] self-start ${BUBBLE_TEXT}`}
        >
          {item.text}
        </p>
      )
  }
}

/** 50px tile beside the first chatbot or partner item of a group (Figma 1715:38122, 1715:38143). */
function SenderTile({ sender, room }: { sender: Sender; room: ChatRoom }) {
  if (sender === 'ai') {
    return <img src={AI_TILE} alt="" className="size-[50px] shrink-0" />
  }
  const tile = <img src={PARTNER_TILE} alt="" className="size-[50px]" />
  if (!room.candidateId) return <span className="shrink-0">{tile}</span>
  return (
    <Link
      to={ROOMMATE_ROUTES.analysis(room.candidateId)}
      state={fromChatState(room.id)}
      aria-label={`${room.partnerName}님 프로필 보기`}
      className="shrink-0 self-start rounded-[15px]"
    >
      {tile}
    </Link>
  )
}

/**
 * The two choices inside the current agenda card (Figma 1715:38109, 1858:17915). They replace the
 * agreement menu bar (QA 6).
 */
function CardActions({
  room,
  isPending,
  agendaRef,
  matchRef,
  onAgenda,
  onMatch,
}: {
  room: ChatRoom
  isPending: boolean
  agendaRef: RefObject<HTMLButtonElement | null>
  matchRef: RefObject<HTMLButtonElement | null>
  onAgenda: () => void
  onMatch: () => void
}) {
  return (
    <div className="mt-2 flex flex-col gap-[5px]">
      <button
        ref={agendaRef}
        type="button"
        disabled={isPending}
        className={CARD_BUTTON}
        onClick={onAgenda}
      >
        <img src={cardArrow} alt="" className="size-5" />
        {room.agendaVoted ? '안건 확정 취소하기' : '다음안건으로'}
      </button>
      <button
        ref={matchRef}
        type="button"
        disabled={isPending}
        className={CARD_BUTTON}
        onClick={onMatch}
      >
        <img src={cardCheck} alt="" className="size-5" />
        {room.matchVoted ? '매칭확정 취소하기' : '매칭확정 하기'}
      </button>
    </div>
  )
}

/** Figma 1715:38109, the redesign of 988:19036, 988:16735, 940:19880 and 1236:14142. */
export default function ChatRoomPage() {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const { room, update } = useChatRoom(roomId)
  const [draft, setDraft] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [hasError, setHasError] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)
  const agendaRef = useRef<HTMLButtonElement>(null)
  const matchRef = useRef<HTMLButtonElement>(null)
  const exitRef = useRef<HTMLButtonElement>(null)
  const [confirming, setConfirming] = useState<
    'agenda' | 'match' | 'exit' | null
  >(null)

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

  const choose = (action: () => Promise<ChatRoom>) => {
    setConfirming(null)
    void run(action)
  }

  // `나가기` ends the room with the existing end request and returns to the list. An ended
  // room has nothing to end, so it only leaves (chat OPEN_QUESTIONS CH-2).
  const exit = async () => {
    if (room.status === 'ended') {
      navigate(CHAT_ROUTES.list)
      return
    }
    setIsPending(true)
    setHasError(false)
    try {
      await chatApi.endRoom(room.id)
      navigate(CHAT_ROUTES.list)
    } catch {
      setConfirming(null)
      setHasError(true)
      setIsPending(false)
    }
  }

  const isEnded = room.status === 'ended'
  const canSend = draft.trim().length > 0 && !isPending && !isEnded
  // The choices sit in the latest agenda or agreement card while the room is open.
  const currentCardId =
    room.status === 'active'
      ? room.items.findLast(
          (item) => item.kind === 'agenda' || item.kind === 'agreement',
        )?.id
      : undefined
  const actions = (
    <CardActions
      room={room}
      isPending={isPending}
      agendaRef={agendaRef}
      matchRef={matchRef}
      // Voting asks first (Figma 1715:38389). Taking a vote back does not (CH-2).
      onAgenda={() =>
        room.agendaVoted
          ? choose(() => chatApi.setAgendaVote(room.id, false))
          : setConfirming('agenda')
      }
      onMatch={() =>
        room.matchVoted
          ? choose(() => chatApi.setMatchVote(room.id, false))
          : setConfirming('match')
      }
    />
  )

  return (
    <div className="flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col bg-brand-cream1 md:h-auto md:min-h-0 md:flex-1">
      <header className="shrink-0 pt-[max(0px,calc(47px-env(safe-area-inset-top)))]">
        <div className="relative flex h-14 items-center justify-between px-6">
          <Link
            to={CHAT_ROUTES.list}
            aria-label="채팅 목록으로 돌아가기"
            className={`${ROUND_BUTTON} flex items-center justify-center`}
          >
            <img src={backArrow} alt="" />
          </Link>
          <h1 className="absolute left-1/2 max-w-[calc(100%-136px)] -translate-x-1/2 truncate text-[18px] leading-[1.5] font-bold text-brand-brown1">
            {room.partnerName}님
          </h1>
          {/* QA 8: one icon replaces the menu screen (Figma log-out 1952:40302). The partner's
              profile stays on their picture in the conversation. */}
          <button
            ref={exitRef}
            type="button"
            aria-label="채팅 종료하기"
            className="relative size-7 shrink-0"
            onClick={() => setConfirming('exit')}
          >
            <img
              src={exitIcon}
              alt=""
              className="absolute -inset-[0.75px] size-[29.5px] max-w-none"
            />
          </button>
        </div>
      </header>
      {isChatSampleOnly && <SampleNotice className="mx-6 mt-2 shrink-0" />}

      <ol
        ref={listRef}
        aria-label="대화 내용"
        className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-[22px] pb-6"
      >
        {room.items.map((item, index) => {
          const sender = senderOf(item)
          const previous = room.items[index - 1]
          const startsGroup = !previous || senderOf(previous) !== sender
          // Figma keeps 10px inside a group and 20px between groups.
          const gap = index === 0 ? '' : startsGroup ? 'mt-5' : 'mt-2.5'
          const view = (
            <ChatItemView
              item={item}
              room={room}
              actions={item.id === currentCardId ? actions : undefined}
            />
          )
          if (sender === 'me' || sender === 'system') {
            return (
              <li key={item.id} className={`flex flex-col ${gap}`}>
                {sender === 'me' && <span className="sr-only">나</span>}
                {view}
              </li>
            )
          }
          return (
            <li key={item.id} className={`flex gap-[9px] ${gap}`}>
              {startsGroup ? (
                <SenderTile sender={sender} room={room} />
              ) : (
                <span className="w-[50px] shrink-0" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                {startsGroup && (
                  <p className="text-[14px] leading-[1.5] font-medium text-black">
                    {sender === 'ai' ? BOT_NAME : room.partnerName}
                  </p>
                )}
                {view}
              </div>
            </li>
          )
        })}
      </ol>

      <footer className="flex shrink-0 flex-col gap-4 px-6 pb-[max(7px,calc(41px-env(safe-area-inset-bottom)))]">
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
              className="h-[42px] w-full rounded-[20px] border border-gray-100 bg-white pr-12 pl-3 text-[16px] leading-[1.5] text-gray-black outline-none placeholder:text-gray-500 focus-visible:border-brand-brown2 disabled:opacity-60"
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              type="submit"
              aria-label="메시지 보내기"
              disabled={!canSend}
              className="absolute top-[7px] right-3 size-7 disabled:opacity-40"
            >
              <img src={sendIcon} alt="" />
            </button>
          </form>
        </div>
      </footer>
      {confirming === 'agenda' && (
        <ChoiceDialog
          title="다음 안건으로 넘어가시겠습니까?"
          message={
            '안건을 확정하면 다시 수정할 수 없어요\nAI가 다음 안건으로 이동해요'
          }
          cancelLabel="취소하기"
          confirmLabel="확정하기"
          triggerRef={agendaRef}
          onCancel={() => setConfirming(null)}
          onConfirm={() => choose(() => chatApi.setAgendaVote(room.id, true))}
        />
      )}
      {confirming === 'match' && (
        // Figma 1858:18674.
        <ChoiceDialog
          title="매칭을 확정하시겠습니까?"
          message={'서로 확정하기를 선택할 시 최종\n매칭이 완료됩니다'}
          cancelLabel="취소하기"
          confirmLabel="확정하기"
          triggerRef={matchRef}
          onCancel={() => setConfirming(null)}
          onConfirm={() => choose(() => chatApi.setMatchVote(room.id, true))}
        />
      )}
      {confirming === 'exit' && (
        // Figma 1952:40268.
        <ChoiceDialog
          title="정말로 채팅을 종료하시겠습니까?"
          message={'채팅을 종료하면 모든 채팅내역이\n사라지게 됩니다'}
          cancelLabel="취소하기"
          confirmLabel="나가기"
          triggerRef={exitRef}
          onCancel={() => setConfirming(null)}
          onConfirm={exit}
        />
      )}
    </div>
  )
}
