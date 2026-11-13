import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Link, useNavigate } from 'react-router'
import cardArrow from '../../assets/chat/card-arrow-right.svg'
import cardCheck from '../../assets/chat/card-check-circle.svg'
import exitIcon from '../../assets/chat/exit-round.svg'
import sendIcon from '../../assets/chat/send-round.svg'
import backArrow from '../../assets/question/back-arrow-brown.svg'
import ChoiceDialog from '../../components/dialog/ChoiceDialog'
import { ErrorState, LoadingState } from '../../components/LoadState/LoadState'
import { isApiError } from '../../lib/api/apiError'
import { errorText } from '../../lib/api/errorText'
import {
  MESSAGE_MAX_LENGTH,
  type Agenda,
  type Message,
  type Room,
} from '../../lib/chat/matchingApi'
import { CHAT_ROUTES, fromChatState } from '../../lib/chat/routes'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'
import AiCard from './AiCard'
import { AI_TILE, PARTNER_TILE } from './chatAvatars'
import {
  BOT_NAME,
  BUBBLE_TEXT,
  CARD_BUTTON,
  LEFT_BUBBLE,
  ROUND_BUTTON,
} from './chatRoomStyles'
import { useServerChat } from './useServerChat'

type Sender = 'ai' | 'me' | 'partner' | 'system'

/** One entry of the conversation, built from the room's agendas and its messages. */
type Entry =
  | { key: string; sender: 'ai'; kind: 'intro'; agendas: Agenda[] }
  | {
      key: string
      sender: 'ai'
      kind: 'agenda'
      agenda: Agenda
      /** The chatbot's message that opened it, or the agenda's own text. */
      text: string
    }
  | { key: string; sender: 'ai' | 'me' | 'partner'; kind: 'text'; text: string }
  | { key: string; sender: 'system'; kind: 'system'; text: string }

const END_TEXT: Record<NonNullable<Room['endReason']>, string> = {
  USER_ENDED: '매칭이 중지되었어요',
  PARTNER_MATCHED: '상대가 다른 분과 매칭이 완료되었어요',
}

/**
 * The opening card lists the agendas, then each AI message is a bubble, except the first one of
 * each agenda, which becomes that agenda's card (채희 spec 7.7, 7.9). The agenda in discussion
 * gets a card at the end when no message opened it yet.
 */
function buildEntries(room: Room, messages: Message[], myUserId: number) {
  const agendas = new Map(
    room.agendas.map((agenda) => [agenda.agendaId, agenda]),
  )
  const opened = new Set<number>()
  const entries: Entry[] = [
    { key: 'intro', sender: 'ai', kind: 'intro', agendas: room.agendas },
  ]
  for (const message of messages) {
    const key = `m${message.messageId}`
    if (message.type === 'SYSTEM') {
      entries.push({
        key,
        sender: 'system',
        kind: 'system',
        text: message.content,
      })
    } else if (message.type === 'USER') {
      entries.push({
        key,
        sender: message.senderId === myUserId ? 'me' : 'partner',
        kind: 'text',
        text: message.content,
      })
    } else {
      const agenda =
        message.agendaId === null ? undefined : agendas.get(message.agendaId)
      if (agenda && !opened.has(agenda.agendaId)) {
        opened.add(agenda.agendaId)
        entries.push({
          key,
          sender: 'ai',
          kind: 'agenda',
          agenda,
          text: message.content,
        })
      } else {
        entries.push({ key, sender: 'ai', kind: 'text', text: message.content })
      }
    }
  }
  const current = room.agendas.find((agenda) => agenda.status === 'DISCUSSING')
  if (current && !opened.has(current.agendaId)) {
    entries.push({
      key: `a${current.agendaId}`,
      sender: 'ai',
      kind: 'agenda',
      agenda: current,
      text: current.content,
    })
  }
  return entries
}

function EntryView({ entry, actions }: { entry: Entry; actions?: ReactNode }) {
  switch (entry.kind) {
    case 'intro':
      return (
        <AiCard title="안건 조율을 시작할께요!" actions={actions}>
          {entry.agendas.length === 0 ? (
            // Not in Figma: the AI prepares the two agendas right after the request (spec 7.5).
            <p>AI가 두 분의 설문 결과로 조율할 안건을 준비하고 있어요.</p>
          ) : (
            <>
              <p>
                안녕하세요 이번 조율을 함께할 {BOT_NAME}입니다! AI 리포트를
                기반으로 함께 조율할 내용을 선정하여 추천해드려요!
              </p>
              <p className="mt-[18px] font-semibold">[ 조율안건 ]</p>
              <ol className="list-inside list-decimal pl-1">
                {entry.agendas.map((agenda) => (
                  <li key={agenda.agendaId}>{agenda.title}</li>
                ))}
              </ol>
            </>
          )}
        </AiCard>
      )
    case 'agenda': {
      const { agenda } = entry
      const decided = agenda.status === 'DECIDED'
      return (
        <AiCard
          title={`${agenda.seq}. ${agenda.title}`}
          badge={
            decided
              ? { text: '확정', tone: 'done' }
              : { text: '미정', tone: 'open' }
          }
          actions={actions}
        >
          {entry.text}
          {decided && (
            <p className="mt-2 font-semibold">
              {agenda.ruleSummary
                ? `결정 완료: ${agenda.ruleSummary}`
                : '결정 완료'}
            </p>
          )}
        </AiCard>
      )
    }
    case 'system':
      return (
        <p className="self-center rounded-[6px] bg-white px-1.5 text-center text-[12px] leading-[1.5] font-medium tracking-[-0.12px] break-keep text-black">
          {entry.text}
        </p>
      )
    case 'text':
      return entry.sender === 'me' ? (
        <p
          className={`max-w-[min(292px,100%)] self-end rounded-tl-[12px] rounded-b-[12px] border border-brand-cream3 bg-brand-cream2 px-4 py-2 text-gray-black ${BUBBLE_TEXT}`}
        >
          {entry.text}
        </p>
      ) : (
        <p
          className={`${LEFT_BUBBLE} max-w-[min(284px,100%)] self-start ${BUBBLE_TEXT}`}
        >
          {entry.text}
        </p>
      )
  }
}

function SenderTile({ sender, room }: { sender: Sender; room: Room }) {
  if (sender === 'ai') {
    return <img src={AI_TILE} alt="" className="size-[50px] shrink-0" />
  }
  return (
    <Link
      to={ROOMMATE_ROUTES.analysis(String(room.partner.userId))}
      state={fromChatState(String(room.matchingId))}
      aria-label={`${room.partner.nickname}님 프로필 보기`}
      className="shrink-0 self-start rounded-[15px]"
    >
      <img src={PARTNER_TILE} alt="" className="size-[50px]" />
    </Link>
  )
}

/**
 * The card's two choices. An agenda is decided by one person and cannot be taken back, and my
 * final choice waits for the partner's, so neither has a cancel button here (spec 7.11, 7.13).
 */
function CardActions({
  room,
  isPending,
  agendaRef,
  matchRef,
  onAgenda,
  onMatch,
}: {
  room: Room
  isPending: boolean
  agendaRef: RefObject<HTMLButtonElement | null>
  matchRef: RefObject<HTMLButtonElement | null>
  onAgenda?: () => void
  onMatch: () => void
}) {
  return (
    <div className="mt-2 flex flex-col gap-[5px]">
      {onAgenda && (
        <button
          ref={agendaRef}
          type="button"
          disabled={isPending}
          className={CARD_BUTTON}
          onClick={onAgenda}
        >
          <img src={cardArrow} alt="" className="size-5" />
          다음안건으로
        </button>
      )}
      <button
        ref={matchRef}
        type="button"
        disabled={isPending || room.myConfirmed}
        className={CARD_BUTTON}
        onClick={onMatch}
      >
        <img src={cardCheck} alt="" className="size-5" />
        {room.myConfirmed ? '상대 확정 대기 중' : '매칭확정 하기'}
      </button>
    </div>
  )
}

/** The text for a refused send: the field message for INVALID_INPUT (spec 7.10). */
function sendErrorText(error: unknown) {
  if (isApiError(error) && error.fieldErrors.content) {
    return error.fieldErrors.content
  }
  return errorText(error)
}

/** A room from the server (채희 spec 4.4, 4.5), drawn like the sample room (Figma 1715:38109). */
export default function ServerChatRoom({ matchingId }: { matchingId: number }) {
  const navigate = useNavigate()
  const { state, retry, send, loadOlder, decide, confirm, end } =
    useServerChat(matchingId)
  const [draft, setDraft] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [confirming, setConfirming] = useState<
    'agenda' | 'match' | 'exit' | null
  >(null)
  const listRef = useRef<HTMLOListElement>(null)
  const agendaRef = useRef<HTMLButtonElement>(null)
  const matchRef = useRef<HTMLButtonElement>(null)
  const exitRef = useRef<HTMLButtonElement>(null)
  /** The list height before older messages were added, to keep the reader's place. */
  const prependFromRef = useRef<number | null>(null)

  const ready = state.status === 'ready' ? state : null
  const lastId = ready?.messages.at(-1)?.messageId ?? 0
  const firstId = ready?.messages[0]?.messageId ?? 0

  // New messages at the end scroll to the bottom.
  useEffect(() => {
    const list = listRef.current
    if (list && prependFromRef.current === null) {
      list.scrollTop = list.scrollHeight
    }
  }, [lastId, ready?.room.agendas.length])

  // Older messages in front keep what the reader was looking at.
  useLayoutEffect(() => {
    const list = listRef.current
    const before = prependFromRef.current
    if (list && before !== null) {
      list.scrollTop += list.scrollHeight - before
      prependFromRef.current = null
    }
  }, [firstId])

  if (state.status === 'loading' || state.status === 'error') {
    return (
      <div className="flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col bg-brand-cream1 md:h-auto md:min-h-0 md:flex-1">
        <header className="shrink-0 pt-[max(0px,calc(47px-env(safe-area-inset-top)))]">
          <div className="relative flex h-14 items-center px-6">
            <Link
              to={CHAT_ROUTES.list}
              aria-label="채팅 목록으로 돌아가기"
              className={`${ROUND_BUTTON} flex items-center justify-center`}
            >
              <img src={backArrow} alt="" />
            </Link>
          </div>
        </header>
        <div className="px-6">
          {state.status === 'loading' ? (
            <LoadingState label="대화를 불러오는 중이에요" />
          ) : (
            <ErrorState
              error={state.error}
              onRetry={state.canRetry ? retry : undefined}
            />
          )}
        </div>
      </div>
    )
  }

  const { room, messages, myUserId, hasMore } = state
  const isChatting = room.status === 'CHATTING'
  const entries = buildEntries(room, messages, myUserId)
  const current = room.agendas.find((agenda) => agenda.status === 'DISCUSSING')
  // The choices sit in the agenda in discussion, or in the opening card when there is none.
  const actionsKey = !isChatting
    ? undefined
    : current
      ? entries.findLast(
          (entry) =>
            entry.kind === 'agenda' &&
            entry.agenda.agendaId === current.agendaId,
        )?.key
      : 'intro'

  const run = async (action: () => Promise<void>) => {
    setIsPending(true)
    setError(null)
    try {
      await action()
      return true
    } catch (failure) {
      setError(errorText(failure))
      return false
    } finally {
      setIsPending(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || isPending || !isChatting) return
    setIsPending(true)
    setError(null)
    try {
      await send(text)
      setDraft('')
    } catch (failure) {
      // The draft stays, so sending again is one tap.
      setError(sendErrorText(failure))
    } finally {
      setIsPending(false)
    }
  }

  const decideCurrent = async () => {
    setConfirming(null)
    if (!current) return
    let allDecided = false
    const done = await run(async () => {
      allDecided = await decide(current.agendaId)
    })
    // The last agenda opens the final match dialog once (spec 7.11).
    if (done && allDecided) setConfirming('match')
  }

  const confirmMatch = () => {
    setConfirming(null)
    void run(confirm)
  }

  const exit = async () => {
    if (!isChatting) {
      navigate(CHAT_ROUTES.list)
      return
    }
    if (await run(end)) navigate(CHAT_ROUTES.list)
    else setConfirming(null)
  }

  const showOlder = async () => {
    const list = listRef.current
    setIsLoadingOlder(true)
    prependFromRef.current = list ? list.scrollHeight : null
    try {
      await loadOlder()
    } catch (failure) {
      prependFromRef.current = null
      setError(errorText(failure))
    } finally {
      setIsLoadingOlder(false)
    }
  }

  const actions = (
    <CardActions
      room={room}
      isPending={isPending}
      agendaRef={agendaRef}
      matchRef={matchRef}
      onAgenda={current ? () => setConfirming('agenda') : undefined}
      onMatch={() => setConfirming('match')}
    />
  )

  const canSend = draft.trim().length > 0 && !isPending && isChatting

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
            {room.partner.nickname}님
          </h1>
          <button
            ref={exitRef}
            type="button"
            aria-label={isChatting ? '채팅 종료하기' : '채팅 목록으로 나가기'}
            className="relative size-7 shrink-0"
            onClick={() =>
              isChatting ? setConfirming('exit') : navigate(CHAT_ROUTES.list)
            }
          >
            <img
              src={exitIcon}
              alt=""
              className="absolute -inset-[0.75px] size-[29.5px] max-w-none"
            />
          </button>
        </div>
      </header>

      <ol
        ref={listRef}
        aria-label="대화 내용"
        className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-[22px] pb-6"
      >
        {hasMore && (
          <li className="mb-4 flex justify-center">
            <button
              type="button"
              disabled={isLoadingOlder}
              className="rounded-full bg-white px-3 py-1 text-[12px] leading-[1.5] font-medium text-gray-500 disabled:opacity-60"
              onClick={showOlder}
            >
              {isLoadingOlder ? '불러오는 중이에요' : '이전 대화 보기'}
            </button>
          </li>
        )}
        {entries.map((entry, index) => {
          const previous = entries[index - 1]
          const startsGroup = !previous || previous.sender !== entry.sender
          // Figma keeps 10px inside a group and 20px between groups.
          const gap = index === 0 ? '' : startsGroup ? 'mt-5' : 'mt-2.5'
          const view = (
            <EntryView
              entry={entry}
              actions={entry.key === actionsKey ? actions : undefined}
            />
          )
          if (entry.sender === 'me' || entry.sender === 'system') {
            return (
              <li key={entry.key} className={`flex flex-col ${gap}`}>
                {entry.sender === 'me' && <span className="sr-only">나</span>}
                {view}
              </li>
            )
          }
          return (
            <li key={entry.key} className={`flex gap-[9px] ${gap}`}>
              {startsGroup ? (
                <SenderTile sender={entry.sender} room={room} />
              ) : (
                <span className="w-[50px] shrink-0" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                {startsGroup && (
                  <p className="text-[14px] leading-[1.5] font-medium text-black">
                    {entry.sender === 'ai' ? BOT_NAME : room.partner.nickname}
                  </p>
                )}
                {view}
              </div>
            </li>
          )
        })}
      </ol>

      <footer className="flex shrink-0 flex-col gap-4 px-6 pb-[max(7px,calc(41px-env(safe-area-inset-bottom)))]">
        {room.status === 'CONFIRMED' && (
          <p
            role="status"
            className="flex h-10 items-center self-center rounded-[62px] bg-brand-beige1 p-2.5 text-[14px] leading-[1.5] font-semibold text-chat-badge-text"
          >
            🎉 매칭이 확정되었습니다
          </p>
        )}
        {room.status === 'ENDED' && (
          <p
            role="status"
            className="flex h-10 items-center self-center rounded-[62px] bg-white p-2.5 text-[14px] leading-[1.5] font-semibold text-gray-500"
          >
            {room.endReason ? END_TEXT[room.endReason] : '매칭이 종료되었어요'}
          </p>
        )}
        <div>
          {error && (
            <p
              role="alert"
              className="mb-2 text-center text-[12px] leading-[1.5] break-keep text-chat-danger"
            >
              {error}
            </p>
          )}
          <form className="relative" onSubmit={submit}>
            <input
              type="text"
              aria-label="메시지 입력"
              placeholder="메세지 입력"
              value={draft}
              maxLength={MESSAGE_MAX_LENGTH}
              disabled={!isChatting}
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
          onConfirm={decideCurrent}
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
          onConfirm={confirmMatch}
        />
      )}
      {confirming === 'exit' && (
        // Figma 1952:40268, with the server rule: an ended room cannot start again (spec 7.12).
        <ChoiceDialog
          title="정말로 채팅을 종료하시겠습니까?"
          message={
            '종료한 매칭은 다시 시작하거나\n대화를 다시 신청할 수 없어요'
          }
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
