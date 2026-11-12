import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import background from '../../assets/chat/list-background.png'
import BottomNav from '../../components/BottomNav/BottomNav'
import {
  chatApi,
  isChatSampleOnly,
  type ChatRoom,
} from '../../lib/chat/chatApi'
import { CHAT_ROUTES } from '../../lib/chat/routes'
import { LIST_AVATARS } from './chatAvatars'
import SampleNotice from './SampleNotice'

// Preview copy per room state, from the Figma list frames 1057:13344 and 1349:19651.
const STATUS_TEXT: Record<ChatRoom['status'], string> = {
  active: '매칭이 시작되었어요',
  matched: '매칭이 완료되었어요',
  ended: '매칭이 종료되었어요',
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

/** Figma 1057:13344, with the rows of 1377:57476. */
export default function ChatListPage() {
  const [rooms, setRooms] = useState<ChatRoom[] | null>(null)

  useEffect(() => {
    let active = true
    chatApi
      .listRooms()
      .catch(() => [])
      .then((result) => {
        if (active) setRooms(result)
      })
    return () => {
      active = false
    }
  }, [])

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
      <header className="pt-[max(0px,calc(55px-env(safe-area-inset-top)))]">
        <h1 className="flex h-14 items-center justify-center text-[18px] leading-[1.5] font-bold text-brand-brown1">
          채팅
        </h1>
      </header>
      <main
        data-testid="chat-list-scroll"
        className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-6 pt-[19px] pb-6"
      >
        {isChatSampleOnly && <SampleNotice className="mb-3" />}
        {rooms?.length === 0 && (
          <p className="mt-10 text-center text-[14px] text-gray-500">
            아직 채팅방이 없어요
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {rooms?.map((room) => (
            <li key={room.id}>
              {/* The visual spans run together, so screen readers get a spaced summary. */}
              <Link
                to={CHAT_ROUTES.room(room.id)}
                aria-label={`${room.partnerName}님, ${room.updatedAt}, 매칭률 ${room.matchRate}%, ${room.unreadCount > 0 ? `새 메시지 ${room.unreadCount}개, ` : ''}${previewOf(room)}`}
                className="relative flex h-20 items-center gap-3.5 rounded-[18px] bg-white pr-4 pl-1.5"
              >
                <img
                  src={LIST_AVATARS[room.listAvatar]}
                  alt=""
                  className="size-[52px] shrink-0"
                />
                <span className="flex min-w-0 flex-col gap-[5px]">
                  <span className="flex items-end gap-1 text-[12px] leading-[1.5] whitespace-nowrap">
                    <span className="font-semibold text-gray-black">
                      {room.partnerName}님
                    </span>
                    <span className="font-medium text-brand-brown1">
                      {room.updatedAt}
                    </span>
                    <span className="ml-[3px] text-[14px] font-bold tracking-[0.25px] text-gray-500">
                      {room.matchRate}
                      <span className="text-[9.143px] tracking-[0.18px]">
                        %
                      </span>
                    </span>
                  </span>
                  <span
                    className={`truncate text-[14px] leading-[1.5] font-medium text-gray-black ${room.unreadCount > 0 ? 'pr-8' : ''}`}
                  >
                    {previewOf(room)}
                  </span>
                </span>
                {room.unreadCount > 0 && (
                  <span className="absolute top-9 right-[17px] flex h-5 min-w-5 items-center justify-center rounded-full bg-home-alert px-1.5 text-[14px] leading-[1.5] font-medium text-white">
                    {room.unreadCount > 99 ? '99+' : room.unreadCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <BottomNav active="chat" />
    </div>
  )
}
