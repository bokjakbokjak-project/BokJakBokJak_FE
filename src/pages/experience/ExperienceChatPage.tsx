import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import cardArrow from '../../assets/chat/card-arrow-right.svg'
import cardCheck from '../../assets/chat/card-check-circle.svg'
import backArrow from '../../assets/question/back-arrow-brown.svg'
import ChoiceDialog from '../../components/dialog/ChoiceDialog'
import {
  AUTO_REPLY_MS,
  currentScenario,
  isWaitingForPartner,
  type ChatMessage,
  type ExperienceChatState,
} from '../../lib/experience/chatMachine'
import { dispatchExperienceChat } from '../../lib/experience/experienceChat'
import { isExperienceMode } from '../../lib/experience/mode'
import { AGREE_TEXT } from '../../lib/experience/scenarios'
import { useExperienceSession } from '../../lib/experience/session'
import { CHAT_ROUTES } from '../../lib/chat/routes'
import { HOME_ROUTES } from '../../lib/home/routes'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'
import AiCard from '../chat/AiCard'
import { AI_TILE, PARTNER_TILE } from '../chat/chatAvatars'
import {
  BOT_NAME,
  BUBBLE_TEXT,
  CARD_BUTTON,
  LEFT_BUBBLE,
  ROUND_BUTTON,
} from '../chat/chatRoomStyles'
import ExperienceRestartButtons from './ExperienceRestartButtons'

/** A reply to pick, drawn like my own bubble so it reads as what I will say. */
const REPLY =
  'w-full rounded-[12px] border border-brand-cream3 bg-brand-cream2 px-4 py-2.5 text-left text-[14px] leading-[1.5] font-medium break-keep text-gray-black transition-colors hover:bg-brand-beige1'

const NOTE =
  'rounded-[10px] bg-white/80 px-3 py-2 text-center text-[12px] leading-[1.5] font-medium break-keep text-gray-500'

type Sender = ChatMessage['from']

/**
 * The experience chat (요청서 6) in the chat room's own design (Figma 1715:38109): the chatbot's
 * agenda cards with 미정 and 확정, the partner's and my bubbles, and the card's
 * `다음안건으로` / `매칭확정 하기`. The partner answers by itself, and the reply is picked
 * instead of typed, so every answer fits what was said. No chat or matching API is called; the
 * state lives in the experience session, so the home shows the match it ends with.
 */
export default function ExperienceChatPage() {
  const session = useExperienceSession()
  const chat = session?.chat ?? null

  // The partner's move. The timer is cleared when the state changes, the page closes or the
  // mode switches (a reload), and the action names its state, so it can never apply twice.
  const step = chat?.step
  const waiting = chat ? isWaitingForPartner(chat) : false
  useEffect(() => {
    if (!waiting || step === undefined) return
    const timer = window.setTimeout(
      () => dispatchExperienceChat({ type: 'auto', step }),
      AUTO_REPLY_MS,
    )
    return () => window.clearTimeout(timer)
  }, [waiting, step])

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
          <h1 className="absolute left-1/2 max-w-[calc(100%-136px)] -translate-x-1/2 truncate text-[18px] leading-[1.5] font-bold text-brand-brown1">
            {chat ? `${chat.partner.name}님` : '체험 대화'}
          </h1>
        </div>
      </header>
      {chat ? <Room chat={chat} /> : <NoChat />}
    </div>
  )
}

function NoChat() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[16px] leading-[1.5] font-medium break-keep text-gray-500">
        아직 시작한 체험 대화가 없어요.
        <br />
        룸메이트 후보의 매칭 분석에서 대화를 시작해보세요.
      </p>
      <Link
        to={ROOMMATE_ROUTES.list}
        className="rounded-full bg-brand-brown1 px-6 py-2.5 text-[16px] font-semibold text-white"
      >
        룸메이트 보러 가기
      </Link>
    </main>
  )
}

function Room({ chat }: { chat: ExperienceChatState }) {
  const listRef = useRef<HTMLOListElement>(null)
  const agendaRef = useRef<HTMLButtonElement>(null)
  const matchRef = useRef<HTMLButtonElement>(null)
  const [confirming, setConfirming] = useState<'agenda' | 'match' | null>(null)

  const count = chat.messages.length
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [count, chat.phase])

  const isLastAgenda = chat.agendaIndex + 1 >= chat.agendas.length
  // The card choices sit on the agreement of the agenda just settled (Figma 1715:38109).
  const cardActions =
    chat.phase === 'agreed' ? (
      <div className="mt-2 flex flex-col gap-[5px]">
        {isLastAgenda ? (
          <button
            ref={matchRef}
            type="button"
            className={CARD_BUTTON}
            onClick={() => setConfirming('match')}
          >
            <img src={cardCheck} alt="" className="size-5" />
            매칭확정 하기
          </button>
        ) : (
          <button
            ref={agendaRef}
            type="button"
            className={CARD_BUTTON}
            onClick={() => setConfirming('agenda')}
          >
            <img src={cardArrow} alt="" className="size-5" />
            다음안건으로
          </button>
        )}
      </div>
    ) : undefined
  const lastAgreementId = chat.messages.findLast(
    (message) => message.kind === 'agreement',
  )?.id

  return (
    <>
      <div className="mx-6 mt-2 flex shrink-0 flex-col gap-1.5">
        <p role="note" className={NOTE}>
          자동으로 응답하는 체험 상대예요. 실제로는 전송되지 않아요.
        </p>
        {chat.switchedToExample && (
          <p role="note" className={NOTE}>
            선택한 후보의 분석에는 준비된 조율 안건이 없어서, 예시 두 사람의
            대화로 체험해요.
          </p>
        )}
      </div>
      <ol
        ref={listRef}
        aria-label="대화 내용"
        aria-live="polite"
        className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-[22px] pb-6"
      >
        {chat.messages.map((message, index) => {
          const previous = chat.messages[index - 1]
          const startsGroup = !previous || previous.from !== message.from
          // Figma keeps 10px inside a group and 20px between groups.
          const gap = index === 0 ? '' : startsGroup ? 'mt-5' : 'mt-2.5'
          const view = (
            <MessageView
              message={message}
              actions={message.id === lastAgreementId ? cardActions : undefined}
            />
          )
          if (message.from === 'me' || message.from === 'status') {
            return (
              <li key={message.id} className={`flex flex-col ${gap}`}>
                {message.from === 'me' && <span className="sr-only">나</span>}
                {view}
              </li>
            )
          }
          return (
            <li key={message.id} className={`flex gap-[9px] ${gap}`}>
              {startsGroup ? (
                <SenderTile sender={message.from} chat={chat} />
              ) : (
                <span className="w-[50px] shrink-0" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                {startsGroup && (
                  <p className="text-[14px] leading-[1.5] font-medium text-black">
                    {message.from === 'ai' ? BOT_NAME : chat.partner.name}
                  </p>
                )}
                {view}
              </div>
            </li>
          )
        })}
        {isWaitingForPartner(chat) && (
          <li className="mt-2.5 self-center text-[12px] leading-[1.5] font-medium text-gray-400">
            {chat.partner.name}님이{' '}
            {chat.phase === 'partner-confirming'
              ? '매칭 확정을 고민하고 있어요…'
              : '답장을 쓰고 있어요…'}
          </li>
        )}
      </ol>
      <Footer chat={chat} />
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
          onConfirm={() => {
            setConfirming(null)
            dispatchExperienceChat({ type: 'complete-agenda' })
          }}
        />
      )}
      {confirming === 'match' && (
        // Figma 1858:18674, as in the chat room.
        <ChoiceDialog
          title="매칭을 확정하시겠습니까?"
          message={'서로 확정하기를 선택할 시 최종\n매칭이 완료됩니다'}
          cancelLabel="취소하기"
          confirmLabel="확정하기"
          triggerRef={matchRef}
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            setConfirming(null)
            // Settling the last agenda is not the match: the match needs both choices.
            dispatchExperienceChat({ type: 'complete-agenda' })
            dispatchExperienceChat({ type: 'confirm' })
          }}
        />
      )}
    </>
  )
}

function MessageView({
  message,
  actions,
}: {
  message: ChatMessage
  actions?: ReactNode
}) {
  if (message.from === 'ai') {
    if (message.kind === 'intro') {
      return (
        <AiCard title={message.title ?? ''}>
          <p>{message.text}</p>
          <p className="mt-[18px] font-semibold">[ 조율안건 ]</p>
          <ol className="list-inside list-decimal pl-1">
            {message.agendas?.map((agenda) => (
              <li key={agenda}>{agenda}</li>
            ))}
          </ol>
        </AiCard>
      )
    }
    return (
      <AiCard
        title={message.title ?? ''}
        badge={
          message.kind === 'agreement'
            ? { text: '확정', tone: 'done' }
            : { text: '미정', tone: 'open' }
        }
        actions={actions}
      >
        {message.text}
      </AiCard>
    )
  }
  if (message.from === 'status') {
    return (
      <p className="self-center rounded-[6px] bg-white px-1.5 text-[12px] leading-[1.5] font-medium tracking-[-0.12px] text-black">
        {message.text}
      </p>
    )
  }
  return message.from === 'me' ? (
    <p
      className={`max-w-[min(292px,100%)] self-end rounded-tl-[12px] rounded-b-[12px] border border-brand-cream3 bg-brand-cream2 px-4 py-2 text-gray-black ${BUBBLE_TEXT}`}
    >
      {message.text}
    </p>
  ) : (
    <p
      className={`${LEFT_BUBBLE} max-w-[min(284px,100%)] self-start ${BUBBLE_TEXT}`}
    >
      {message.text}
    </p>
  )
}

/** 50px tile beside the first chatbot or partner item of a group, as in the chat room. */
function SenderTile({
  sender,
  chat,
}: {
  sender: Sender
  chat: ExperienceChatState
}) {
  if (sender === 'ai') {
    return <img src={AI_TILE} alt="" className="size-[50px] shrink-0" />
  }
  const tile = <img src={PARTNER_TILE} alt="" className="size-[50px]" />
  if (!chat.partner.candidateId) return <span className="shrink-0">{tile}</span>
  return (
    <Link
      to={ROOMMATE_ROUTES.analysis(chat.partner.candidateId)}
      aria-label={`${chat.partner.name}님 프로필 보기`}
      className="shrink-0 self-start rounded-[15px]"
    >
      {tile}
    </Link>
  )
}

function Footer({ chat }: { chat: ExperienceChatState }) {
  const navigate = useNavigate()
  const wrap = (children: ReactNode) => (
    <footer className="flex shrink-0 flex-col gap-2 px-6 pb-[max(7px,calc(41px-env(safe-area-inset-bottom)))]">
      {children}
    </footer>
  )

  switch (chat.phase) {
    case 'intro':
      return wrap(
        <>
          <p className="text-[12px] leading-[1.5] font-semibold text-gray-500">
            보낼 답장을 골라주세요
          </p>
          {currentScenario(chat).options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={REPLY}
              onClick={() =>
                dispatchExperienceChat({ type: 'choose', optionId: option.id })
              }
            >
              {option.mine}
            </button>
          ))}
        </>,
      )
    case 'agree':
      return wrap(
        <button
          type="button"
          className={REPLY}
          onClick={() => dispatchExperienceChat({ type: 'agree' })}
        >
          {AGREE_TEXT}
        </button>,
      )
    case 'matched':
      return wrap(
        <>
          <p
            role="status"
            className="flex h-10 items-center self-center rounded-[62px] bg-brand-beige1 p-2.5 text-[14px] leading-[1.5] font-semibold text-chat-badge-text"
          >
            🎉 매칭이 확정되었습니다
          </p>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center rounded-[10px] bg-brand-brown1 text-[16px] leading-[1.5] font-semibold text-white"
            onClick={() => navigate(HOME_ROUTES.home)}
          >
            홈으로 가기
          </button>
          {isExperienceMode() && <ExperienceRestartButtons />}
        </>,
      )
    default:
      // Waiting for the partner, or for the choice on the agreement card.
      return null
  }
}
