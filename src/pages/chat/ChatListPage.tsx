import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import background from '../../assets/chat/list-background.png'
import BottomNav from '../../components/BottomNav/BottomNav'
import { chatApi, type ChatRoom } from '../../lib/chat/chatApi'
import { CHAT_ROUTES } from '../../lib/chat/routes'
import { LIST_AVATARS } from './chatAvatars'

// Preview copy per room state, from the Figma list frames 1057:13344 and 1349:19651.
const STATUS_TEXT: Record<ChatRoom['status'], string> = {
  active: '매칭이 시작되었어요',
  matched: '매칭이 완료되었어요',
  ended: '매칭이 종료되었어요',
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
    <div className="relative isolate flex flex-1 flex-col overflow-hidden bg-brand-beige1">
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
      <main className="flex-1 px-6 pt-[19px] pb-6">
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
                aria-label={`${room.partnerName}님, ${room.updatedAt}, 매칭률 ${room.matchRate}%, ${room.partnerName}님과의 ${STATUS_TEXT[room.status]}`}
                className="flex h-20 items-center gap-3.5 rounded-[18px] bg-white pr-4 pl-1.5"
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
                  <span className="truncate text-[14px] leading-[1.5] font-medium text-gray-black">
                    {room.partnerName}님과의 {STATUS_TEXT[room.status]}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <BottomNav active="chat" />
    </div>
  )
}
