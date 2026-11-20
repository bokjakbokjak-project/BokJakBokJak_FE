import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import RoommateHeader from '../../components/roommate/RoommateHeader'
import RoommatePage from '../../components/roommate/RoommatePage'
import {
  AUTO_REPLY_MS,
  currentScenario,
  isWaitingForPartner,
  type ExperienceChatState,
} from '../../lib/experience/chatMachine'
import { dispatchExperienceChat } from '../../lib/experience/experienceChat'
import { isExperienceMode } from '../../lib/experience/mode'
import { useExperienceSession } from '../../lib/experience/session'
import { AGREE_TEXT } from '../../lib/experience/scenarios'
import { HOME_ROUTES } from '../../lib/home/routes'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'
import { BUBBLE_TEXT, LEFT_BUBBLE } from '../chat/chatRoomStyles'
import ExperienceRestartButtons from './ExperienceRestartButtons'

const ACTION_BUTTON =
  'flex min-h-[52px] w-full items-center justify-center rounded-[10px] px-4 py-2.5 text-center text-[16px] leading-[1.5] font-semibold break-keep'
const PRIMARY = `${ACTION_BUTTON} bg-brand-brown1 text-white`
const OPTION = `${ACTION_BUTTON} border border-brand-cream3 bg-white text-brand-brown1`

/**
 * The experience chat (요청서 6): a scripted talk with an experience partner who answers by
 * itself. The user picks a reply instead of typing, so every answer fits what was said. It never
 * calls a chat or matching API; the state lives in the experience session, so the home shows
 * the match it ends with.
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

  if (!chat) {
    return (
      <RoommatePage>
        <RoommateHeader backTo={ROOMMATE_ROUTES.list} title="체험 대화" />
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
      </RoommatePage>
    )
  }

  return (
    <RoommatePage footer={<ChatActions chat={chat} />}>
      <RoommateHeader
        backTo={ROOMMATE_ROUTES.list}
        title={chat.partner.name}
        action={
          chat.partner.candidateId ? (
            <Link
              to={ROOMMATE_ROUTES.analysis(chat.partner.candidateId)}
              className="rounded-full border border-brand-cream3 bg-white px-2.5 py-0.5 text-[12px] leading-[1.5] font-semibold whitespace-nowrap text-brand-brown3"
            >
              분석 보기
            </Link>
          ) : undefined
        }
      />
      <Notices chat={chat} />
      <Messages chat={chat} />
    </RoommatePage>
  )
}

function Notices({ chat }: { chat: ExperienceChatState }) {
  const scenario = currentScenario(chat)
  return (
    <div className="mx-6 flex shrink-0 flex-col gap-1.5">
      <p
        role="note"
        className="rounded-[10px] bg-white/85 px-3 py-2 text-center text-[12px] leading-[1.5] font-medium break-keep text-gray-500"
      >
        자동으로 응답하는 체험 상대와의 대화예요. 실제 사용자에게 대화 요청이나
        메시지가 전송되지 않아요.
      </p>
      {chat.switchedToExample && (
        <p
          role="note"
          className="rounded-[10px] bg-roommate-pink/40 px-3 py-2 text-center text-[12px] leading-[1.5] font-medium break-keep text-brand-brown1"
        >
          선택한 후보의 분석에는 준비된 조율 안건이 없어서, 예시 두 사람(나와{' '}
          {chat.partner.name}님)의 대화로 체험해요.
        </p>
      )}
      <p className="text-center text-[13px] leading-[1.5] font-bold text-brand-brown3">
        안건 {chat.agendaIndex + 1}/{chat.agendas.length} · {scenario.title}
      </p>
    </div>
  )
}

function Messages({ chat }: { chat: ExperienceChatState }) {
  const endRef = useRef<HTMLDivElement>(null)
  const count = chat.messages.length
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [count, chat.phase])

  return (
    <div
      data-testid="experience-messages"
      className="scrollbar-none mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-6 pb-4"
      aria-live="polite"
    >
      {chat.messages.map((message) =>
        message.from === 'system' ? (
          message.agreement ? (
            <div
              key={message.id}
              className="mx-auto w-full rounded-[12px] border-2 border-brand-brown3 bg-brand-cream2 px-4 py-3 text-center"
            >
              <p className="text-[12px] leading-[1.5] font-semibold text-brand-brown3">
                합의 예시
              </p>
              <p className="mt-0.5 text-[15px] leading-[1.5] font-bold break-keep text-brand-brown1">
                {message.text}
              </p>
            </div>
          ) : (
            <p
              key={message.id}
              className="mx-auto max-w-[300px] rounded-[10px] bg-brand-beige1 px-3 py-2 text-center text-[13px] leading-[1.5] font-medium break-keep text-brand-brown1"
            >
              {message.text}
            </p>
          )
        ) : message.from === 'partner' ? (
          <div key={message.id} className="flex flex-col items-start gap-1">
            <span className="text-[12px] font-semibold text-gray-500">
              {chat.partner.name} · 체험 상대
            </span>
            <p className={`max-w-[258px] ${LEFT_BUBBLE} ${BUBBLE_TEXT}`}>
              {message.text}
            </p>
          </div>
        ) : (
          <p
            key={message.id}
            className={`ml-auto max-w-[258px] rounded-tl-[12px] rounded-b-[12px] bg-brand-brown1 px-3 py-2 text-white ${BUBBLE_TEXT}`}
          >
            {message.text}
          </p>
        ),
      )}
      {isWaitingForPartner(chat) && (
        <p className="text-[12px] leading-[1.5] font-medium text-gray-400">
          {chat.partner.name}님이{' '}
          {chat.phase === 'partner-confirming'
            ? '확정을 고민하는'
            : '답장을 쓰는'}{' '}
          중이에요…
        </p>
      )}
      <div ref={endRef} />
    </div>
  )
}

function ChatActions({ chat }: { chat: ExperienceChatState }) {
  const navigate = useNavigate()
  const footer = (children: React.ReactNode) => (
    <div className="relative z-20 shrink-0 bg-brand-cream1 px-6 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-[342px] flex-col gap-2">
        {children}
      </div>
    </div>
  )

  switch (chat.phase) {
    case 'intro':
      return footer(
        <>
          <p className="text-[13px] leading-[1.5] font-semibold text-gray-500">
            내 의견을 골라보세요
          </p>
          {currentScenario(chat).options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={OPTION}
              onClick={() =>
                dispatchExperienceChat({ type: 'choose', optionId: option.id })
              }
            >
              {option.mine}
            </button>
          ))}
        </>,
      )
    case 'partner-replying':
    case 'partner-confirming':
      return footer(
        <button type="button" disabled className={`${OPTION} opacity-60`}>
          상대의 응답을 기다리는 중이에요
        </button>,
      )
    case 'agree':
      return footer(
        <button
          type="button"
          className={OPTION}
          onClick={() => dispatchExperienceChat({ type: 'agree' })}
        >
          {AGREE_TEXT}
        </button>,
      )
    case 'agreed':
      return footer(
        <button
          type="button"
          className={PRIMARY}
          onClick={() => dispatchExperienceChat({ type: 'complete-agenda' })}
        >
          이 내용으로 조율 완료
        </button>,
      )
    case 'final':
      return footer(
        <>
          <p className="text-center text-[13px] leading-[1.5] font-medium break-keep text-gray-500">
            조율을 마쳤어요. 두 사람이 모두 확정해야 매칭이 완료돼요.
          </p>
          <button
            type="button"
            className={PRIMARY}
            onClick={() => dispatchExperienceChat({ type: 'confirm' })}
          >
            매칭 확정하기
          </button>
        </>,
      )
    case 'matched':
      return footer(
        <>
          <div className="rounded-[12px] bg-white px-4 py-3 text-center">
            <p className="text-[18px] leading-[1.5] font-bold text-brand-brown1">
              매칭이 완료됐어요!
            </p>
            <p className="text-[13px] leading-[1.5] font-medium break-keep text-gray-500">
              {chat.partner.name}님과의 체험 매칭이에요. 실제 매칭으로 저장되지
              않아요.
            </p>
          </div>
          <button
            type="button"
            className={PRIMARY}
            onClick={() => navigate(HOME_ROUTES.home)}
          >
            홈으로 가기
          </button>
          {isExperienceMode() && <ExperienceRestartButtons />}
        </>,
      )
  }
}
