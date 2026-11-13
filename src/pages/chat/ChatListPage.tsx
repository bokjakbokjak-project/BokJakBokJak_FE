import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import background from '../../assets/chat/list-background.png'
import BottomNav from '../../components/BottomNav/BottomNav'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/LoadState/LoadState'
import CharacterAvatar from '../../components/roommate/CharacterAvatar'
import { isServerMode } from '../../lib/api/config'
import {
  chatApi,
  isChatSampleOnly,
  type ChatRoom,
} from '../../lib/chat/chatApi'
import {
  listMyRooms,
  type MatchingStatus,
  type RoomSummary,
} from '../../lib/chat/matchingApi'
import { CHAT_ROUTES } from '../../lib/chat/routes'
import { seoulDayLabel } from '../../lib/time/seoulDate'
import { LIST_AVATARS } from './chatAvatars'
import SampleNotice from './SampleNotice'

// Preview copy per room state, from the Figma list frames 1057:13344 and 1349:19651.
const STATUS_TEXT: Record<ChatRoom['status'], string> = {
  active: '매칭이 시작되었어요',
  matched: '매칭이 완료되었어요',
  ended: '매칭이 종료되었어요',
}

const SERVER_STATUS: Record<MatchingStatus, ChatRoom['status']> = {
  CHATTING: 'active',
  CONFIRMED: 'matched',
  ENDED: 'ended',
}

/** A room with unread messages shows the partner's latest message instead (Figma 1574:38000). */
function previewOf(room: ChatRoom) {
  if (room.unreadCount > 0) {
    const latest = room.items.findLast(
      (item) => item.kind === 'message' && item.from === 'partner',
    )
    if (latest?.kind === 'message') return latest.text
  }
  return `${room.partnerName}님과의 ${STATUS_TEXT[room.status]}`
}

type Row = {
  key: string
  to: string
  name: string
  updatedAt: string
  /** The server rooms have no score, so their rows leave it out. */
  matchRate: number | null
  unreadCount: number
  preview: string
  avatar: ReactNode
}

function sampleRow(room: ChatRoom): Row {
  return {
    key: room.id,
    to: CHAT_ROUTES.room(room.id),
    name: room.partnerName,
    updatedAt: room.updatedAt,
    matchRate: room.matchRate,
    unreadCount: room.unreadCount,
    preview: previewOf(room),
    avatar: (
      <img
        src={LIST_AVATARS[room.listAvatar]}
        alt=""
        className="size-[52px] shrink-0"
      />
    ),
  }
}

/**
 * A server room (채희 spec 7.6). There is no unread count in the response, so no badge shows, and
 * a room without messages shows its status line like the samples.
 */
function serverRow(room: RoomSummary): Row {
  const id = String(room.matchingId)
  return {
    key: id,
    to: CHAT_ROUTES.room(id),
    name: room.partner.nickname,
    updatedAt: room.lastMessageAt ? seoulDayLabel(room.lastMessageAt) : '',
    matchRate: null,
    unreadCount: 0,
    preview:
      room.lastMessage ??
      `${room.partner.nickname}님과의 ${STATUS_TEXT[SERVER_STATUS[room.status]]}`,
    avatar: (
      <span className="relative size-[52px] shrink-0">
        <CharacterAvatar priorities={room.partner.priorities} />
      </span>
    ),
  }
}

function ChatRow({ row }: { row: Row }) {
  const label = [
    `${row.name}님`,
    row.updatedAt,
    row.matchRate === null ? '' : `매칭률 ${row.matchRate}%`,
    row.unreadCount > 0 ? `새 메시지 ${row.unreadCount}개` : '',
    row.preview,
  ]
    .filter(Boolean)
    .join(', ')
  return (
    // The visual spans run together, so screen readers get a spaced summary.
    <Link
      to={row.to}
      aria-label={label}
      className="relative flex h-20 items-center gap-3.5 rounded-[18px] bg-white pr-4 pl-1.5"
    >
      {row.avatar}
      <span className="flex min-w-0 flex-col gap-[5px]">
        <span className="flex items-end gap-1 text-[12px] leading-[1.5] whitespace-nowrap">
          <span className="font-semibold text-gray-black">{row.name}님</span>
          <span className="font-medium text-brand-brown1">{row.updatedAt}</span>
          {row.matchRate !== null && (
            <span className="ml-[3px] text-[14px] font-bold tracking-[0.25px] text-gray-500">
              {row.matchRate}
              <span className="text-[9.143px] tracking-[0.18px]">%</span>
            </span>
          )}
        </span>
        <span
          className={`truncate text-[14px] leading-[1.5] font-medium text-gray-black ${row.unreadCount > 0 ? 'pr-8' : ''}`}
        >
          {row.preview}
        </span>
      </span>
      {row.unreadCount > 0 && (
        <span className="absolute top-9 right-[17px] flex h-5 min-w-5 items-center justify-center rounded-full bg-home-alert px-1.5 text-[14px] leading-[1.5] font-medium text-white">
          {row.unreadCount > 99 ? '99+' : row.unreadCount}
        </span>
      )}
    </Link>
  )
}

type Loaded =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; rows: Row[] }

/** The sample rooms, or the server's rooms in server mode. */
function useRows(attempt: number): Loaded {
  const isServer = isServerMode()
  const [loaded, setLoaded] = useState<{ attempt: number; value: Loaded }>()

  useEffect(() => {
    const controller = new AbortController()
    const load = isServer
      ? listMyRooms(controller.signal).then((rooms) => rooms.map(serverRow))
      : // The samples have no failure to show; a failed read is an empty list as before.
        chatApi
          .listRooms()
          .catch(() => [])
          .then((rooms) => rooms.map(sampleRow))
    load.then(
      (rows) => {
        if (!controller.signal.aborted) {
          setLoaded({ attempt, value: { status: 'ready', rows } })
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setLoaded({ attempt, value: { status: 'error', error } })
        }
      },
    )
    return () => controller.abort()
  }, [isServer, attempt])

  return loaded?.attempt === attempt ? loaded.value : { status: 'loading' }
}

/** Figma 1057:13344, with the rows of 1377:57476. */
export default function ChatListPage() {
  const [attempt, setAttempt] = useState(0)
  const rows = useRows(attempt)
  const showSampleNotice = isChatSampleOnly && !isServerMode()

  return (
    // The page is as tall as the screen (the 844px frame on PC), so the bar stays at the bottom
    // and only the list scrolls. The header already allows for the top safe area, so the height
    // leaves it out; the bottom one is taken back like the other tabs, since BottomNav pads it.
    <div className="relative isolate -mb-[env(safe-area-inset-bottom)] flex h-[calc(100dvh-env(safe-area-inset-top))] flex-col overflow-hidden bg-brand-beige1 md:h-[844px]">
      <img
        src={background}
        alt=""
        className="absolute inset-x-0 top-0 -z-10 w-full"
      />
      {/* QA 9: the blue sky at the top becomes the ivory of the home screen, with the same
          cream fade the home screen lays over its room (HomePage). */}
      <div className="absolute inset-x-0 top-0 -z-10 aspect-[390/844]">
        <div className="absolute inset-x-0 top-0 h-[max(258px,30.569%)] bg-[linear-gradient(to_bottom,var(--color-brand-cream1)_67.842%,rgba(255,255,255,0)_96.918%)]" />
      </div>
      <header className="pt-[max(0px,calc(55px-env(safe-area-inset-top)))]">
        <h1 className="flex h-14 items-center justify-center text-[18px] leading-[1.5] font-bold text-brand-brown1">
          채팅
        </h1>
      </header>
      <main
        data-testid="chat-list-scroll"
        className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-6 pt-[19px] pb-6"
      >
        {showSampleNotice && <SampleNotice className="mb-3" />}
        {rows.status === 'loading' && isServerMode() && (
          <LoadingState label="채팅방을 불러오는 중이에요" />
        )}
        {rows.status === 'error' && (
          <ErrorState
            error={rows.error}
            onRetry={() => setAttempt((count) => count + 1)}
          />
        )}
        {rows.status === 'ready' && rows.rows.length === 0 && (
          <EmptyState text="아직 채팅방이 없어요" className="mt-0" />
        )}
        <ul className="flex flex-col gap-1">
          {rows.status === 'ready' &&
            rows.rows.map((row) => (
              <li key={row.key}>
                <ChatRow row={row} />
              </li>
            ))}
        </ul>
      </main>
      <BottomNav active="chat" />
    </div>
  )
}
