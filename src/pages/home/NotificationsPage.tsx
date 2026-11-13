import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import arrowLeft from '../../assets/question/back-arrow-brown.svg'
import { ErrorState, LoadingState } from '../../components/LoadState/LoadState'
import CharacterPreview from '../../components/onboarding/CharacterPreview'
import { isServerMode } from '../../lib/api/config'
import { errorCode, errorText } from '../../lib/api/errorText'
import { CHAT_ROUTES } from '../../lib/chat/routes'
import {
  getNotificationPage,
  markNotificationRead,
  type ServerNotification,
} from '../../lib/home/notificationApi'
import {
  getNotifications,
  type Notification,
  type NotificationSample,
} from '../../lib/home/notificationData'
import { HOME_ROUTES } from '../../lib/home/routes'
import { isSeoulToday, seoulNotificationTime } from '../../lib/time/seoulDate'

// The character drawn in every Figma notification. Real senders' characters are not decided yet.
const SAMPLE_CHARACTER = ['wake-alarm', 'wake-alarm', 'wake-alarm'] as const

type RowData = {
  /** A server notification has no sender field; its text already names the person. */
  sender?: string
  time: string
  message: string
  isNew: boolean
}

function NotificationRow({
  notification: { sender, time, message, isNew },
  badgeClass,
}: {
  notification: RowData
  badgeClass: string
}) {
  return (
    <div className="relative flex h-[52px] items-center gap-5">
      <div
        aria-hidden="true"
        className="relative size-[52px] shrink-0 overflow-clip rounded-[20px] bg-brand-beige2"
      >
        <CharacterPreview
          priorities={SAMPLE_CHARACTER}
          showRug={false}
          className="absolute -top-2 -left-2.5 w-[75.5px]"
        />
      </div>
      <div
        className={`flex min-w-0 flex-col gap-1 leading-[1.5] whitespace-nowrap text-gray-black ${isNew ? 'pr-[38px]' : ''}`}
      >
        <p className="flex gap-1 text-[12px]">
          {sender && <span className="font-semibold">{sender}</span>}
          <span className="font-medium text-brand-brown1">{time}</span>
        </p>
        <p className="truncate text-[14px] font-medium">{message}</p>
      </div>
      {isNew && (
        <span
          className={`absolute top-3.5 flex size-6 items-center justify-center rounded-full bg-brand-brown1 text-[12px] leading-[1.5] font-extrabold text-white ${badgeClass}`}
        >
          <span aria-hidden="true">N</span>
          <span className="sr-only">새 알림</span>
        </span>
      )}
    </div>
  )
}

type Entry = { key: string; content: ReactNode }

/**
 * Figma 805:3459 and 805:3559 (latest revision: N mark instead of the match rate, cream page,
 * brown1 badge, 14px messages, Pretendard throughout): the `오늘` and `이전 알림` sections.
 */
function NotificationsLayout({
  today,
  previous,
  footer,
}: {
  today: Entry[]
  previous: Entry[]
  /** Under the earlier notifications, such as `더보기` or a loading or failure state. */
  footer?: ReactNode
}) {
  return (
    <div className="-mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex flex-1 flex-col bg-brand-cream1 pt-[max(55px,env(safe-area-inset-top))]">
      <header className="relative h-14 shrink-0">
        <Link
          to={HOME_ROUTES.home}
          aria-label="뒤로"
          className="absolute top-3.5 left-6 flex size-7 items-center justify-center rounded-full border-[1.5px] border-transparent transition-colors hover:border-brand-brown3 hover:bg-brand-beige1 focus-visible:border-brand-brown3 focus-visible:bg-brand-beige1 before:absolute before:-inset-2"
        >
          <img src={arrowLeft} alt="" className="size-[15.2px] max-w-none" />
        </Link>
        <h1 className="pt-[15px] text-center text-[18px] leading-[1.5] font-bold text-brand-brown1">
          알림
        </h1>
      </header>
      <main className="flex flex-1 flex-col">
        <section className="px-6">
          <h2 className="mt-[3px] text-[16px] leading-[1.5] font-extrabold text-brand-brown1">
            오늘
          </h2>
          {today.length === 0 ? (
            <p className="mt-[17px] mb-[13px] flex h-[60px] items-center justify-center rounded-[10px] bg-brand-cream2 text-[14px] leading-[1.5] font-medium text-brand-brown2">
              오늘 받은 알림이 없어요.
            </p>
          ) : (
            <ul className="mt-4 mb-[22px]">
              {today.map(({ key, content }) => (
                <li key={key}>{content}</li>
              ))}
            </ul>
          )}
        </section>
        <div className="ml-[3px] h-1.5 shrink-0 bg-brand-beige4" />
        <section className="mt-[15px] px-6">
          <h2 className="text-[16px] leading-[1.5] font-bold text-brand-brown1">
            이전 알림
          </h2>
          <ul className="mt-[15px] flex flex-col gap-2">
            {previous.map(({ key, content }) => (
              <li
                key={key}
                className="flex flex-col gap-2 after:h-0.5 after:bg-brand-beige4"
              >
                {content}
              </li>
            ))}
          </ul>
          {footer}
        </section>
        <p className="mt-auto pt-2.5 pb-[max(46px,env(safe-area-inset-bottom))] text-center text-[12px] leading-[1.5] font-medium text-brand-brown1">
          받은 알림은 30일동안 보관됩니다.
        </p>
      </main>
    </div>
  )
}

/** Sample data only: nothing is fetched, read, or deleted. */
function SampleNotifications({ sample }: { sample?: NotificationSample }) {
  const { today, previous } = getNotifications(sample)
  const entry = (notification: Notification, badgeClass: string) => ({
    key: notification.id,
    content: (
      <NotificationRow notification={notification} badgeClass={badgeClass} />
    ),
  })
  return (
    <NotificationsLayout
      today={today.map((item) => entry(item, 'right-[7.5px]'))}
      previous={previous.map((item) => entry(item, 'right-2.5'))}
    />
  )
}

type Pages = {
  items: ServerNotification[]
  /** The next page to ask for, or null when there is none. */
  nextPage: number | null
}

/**
 * Server mode (채희 spec 7.14, 7.15). Pages of 20 with `더보기` while `has_next`. Today and
 * earlier are split by the Seoul date. A tap marks the notification read, then opens its room.
 */
function ServerNotifications() {
  const navigate = useNavigate()
  const [pages, setPages] = useState<Pages | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [openError, setOpenError] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<number | null>(null)
  const pagesRef = useRef<Pages | null>(null)
  const requestRef = useRef(0)
  /** The page of the last request, which `다시 시도` asks for again. */
  const lastPageRef = useRef(0)

  /** Asks for a page; the state changes only when it answers. */
  const fetchPage = useCallback((page: number) => {
    const request = ++requestRef.current
    lastPageRef.current = page
    getNotificationPage(page).then(
      ({ notifications, hasNext }) => {
        if (request !== requestRef.current) return
        const before = page === 0 ? [] : (pagesRef.current?.items ?? [])
        // A notification that moved to the next page while reading shows once.
        const seen = new Set(before.map((item) => item.notificationId))
        const next = {
          items: [
            ...before,
            ...notifications.filter((item) => !seen.has(item.notificationId)),
          ],
          nextPage: hasNext ? page + 1 : null,
        }
        pagesRef.current = next
        setPages(next)
        setIsLoading(false)
      },
      (error: unknown) => {
        if (request !== requestRef.current) return
        setLoadError(error)
        setIsLoading(false)
      },
    )
  }, [])

  const load = useCallback(
    (page: number) => {
      setIsLoading(true)
      setLoadError(null)
      fetchPage(page)
    },
    [fetchPage],
  )

  // The first page; `isLoading` starts true.
  useEffect(() => {
    fetchPage(0)
    return () => {
      requestRef.current += 1
    }
  }, [fetchPage])

  const open = async (notification: ServerNotification) => {
    if (openingId !== null) return
    setOpeningId(notification.notificationId)
    setOpenError(null)
    try {
      if (!notification.isRead) {
        await markNotificationRead(notification.notificationId)
      }
    } catch (error) {
      const code = errorCode(error)
      // Not the user's notification, or gone: it stays closed and the list is read again.
      if (
        code === 'NOTIFICATION_FORBIDDEN' ||
        code === 'NOTIFICATION_NOT_FOUND'
      ) {
        setOpenError(errorText(error))
        setOpeningId(null)
        load(0)
        return
      }
      // Another failure leaves it unread for the next visit, but the room still opens.
    }
    if (notification.matchingId !== null) {
      navigate(CHAT_ROUTES.room(String(notification.matchingId)))
    } else {
      setOpeningId(null)
      load(0)
    }
  }

  const items = pages?.items ?? []
  const entry = (notification: ServerNotification, badgeClass: string) => ({
    key: String(notification.notificationId),
    content: (
      <button
        type="button"
        className="block w-full text-left disabled:opacity-60"
        disabled={openingId !== null}
        onClick={() => void open(notification)}
      >
        <NotificationRow
          notification={{
            time: seoulNotificationTime(notification.createdAt),
            message: notification.content,
            isNew: !notification.isRead,
          }}
          badgeClass={badgeClass}
        />
      </button>
    ),
  })

  const nextPage = pages?.nextPage ?? null
  const footer = (
    <>
      {openError && (
        <p
          role="alert"
          className="mt-3 text-center text-[12px] leading-[1.5] text-chat-danger"
        >
          {openError}
        </p>
      )}
      {isLoading && <LoadingState label="알림을 불러오는 중이에요" />}
      {!isLoading && loadError !== null && (
        <ErrorState
          error={loadError}
          onRetry={() => load(lastPageRef.current)}
        />
      )}
      {!isLoading && loadError === null && nextPage !== null && (
        <button
          type="button"
          className="mx-auto mt-3 block px-6 py-2 text-[14px] leading-[1.5] font-semibold text-brand-brown3"
          onClick={() => load(nextPage)}
        >
          더보기
        </button>
      )}
    </>
  )

  return (
    <NotificationsLayout
      today={items
        .filter((item) => isSeoulToday(item.createdAt))
        .map((item) => entry(item, 'right-[7.5px]'))}
      previous={items
        .filter((item) => !isSeoulToday(item.createdAt))
        .map((item) => entry(item, 'right-2.5'))}
      footer={footer}
    />
  )
}

/** The server's notifications in server mode, the Figma samples otherwise. */
export default function NotificationsPage({
  sample,
}: {
  sample?: NotificationSample
}) {
  // The preview route always shows its sample.
  if (isServerMode() && !sample) return <ServerNotifications />
  return <SampleNotifications sample={sample} />
}
