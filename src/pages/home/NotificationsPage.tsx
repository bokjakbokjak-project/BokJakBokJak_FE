import { Link } from 'react-router'
import arrowLeft from '../../assets/question/back-arrow-brown.svg'
import CharacterPreview from '../../components/onboarding/CharacterPreview'
import {
  getNotifications,
  type Notification,
  type NotificationSample,
} from '../../lib/home/notificationData'
import { HOME_ROUTES } from '../../lib/home/routes'

// The character drawn in every Figma notification. Real senders' characters are not decided yet.
const SAMPLE_CHARACTER = ['wake-alarm', 'wake-alarm', 'wake-alarm'] as const

function NotificationRow({
  notification: { sender, time, message, isNew },
  badgeClass,
}: {
  notification: Notification
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
        className={`flex min-w-0 flex-col gap-1 text-[12px] leading-[1.5] whitespace-nowrap text-gray-black ${isNew ? 'pr-[38px]' : ''}`}
      >
        <p className="flex gap-1">
          <span className="font-semibold">{sender}</span>
          <span className="font-medium text-brand-brown1">{time}</span>
        </p>
        <p className="truncate font-medium">{message}</p>
      </div>
      {isNew && (
        <span
          className={`absolute top-3.5 flex size-6 items-center justify-center rounded-full bg-brand-brown2 text-[12px] leading-[1.5] font-extrabold text-white ${badgeClass}`}
        >
          <span aria-hidden="true">N</span>
          <span className="sr-only">새 알림</span>
        </span>
      )}
    </div>
  )
}

/** Figma 805:3459 and 805:3559. Sample data only: nothing is fetched, read, or deleted. */
export default function NotificationsPage({
  sample,
}: {
  sample?: NotificationSample
}) {
  const { today, previous } = getNotifications(sample)

  return (
    <div className="-mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex flex-1 flex-col bg-brand-beige5 pt-[max(55px,env(safe-area-inset-top))]">
      <header className="relative h-14 shrink-0">
        <Link
          to={HOME_ROUTES.home}
          aria-label="뒤로"
          className="absolute top-3.5 left-6 flex size-7 items-center justify-center rounded-full border-[1.5px] border-transparent transition-colors hover:border-brand-brown3 hover:bg-brand-beige4 focus-visible:border-brand-brown3 focus-visible:bg-brand-beige4 before:absolute before:-inset-2"
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
            <p className="mt-[17px] mb-[13px] flex h-[60px] items-center justify-center rounded-[10px] bg-brand-beige4 text-[12px] leading-[1.5] font-medium text-brand-brown1">
              오늘 받은 알림이 없어요.
            </p>
          ) : (
            <ul className="mt-4 mb-[22px]">
              {today.map((notification) => (
                <li key={notification.id}>
                  <NotificationRow
                    notification={notification}
                    badgeClass="right-[19.5px]"
                  />
                </li>
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
            {previous.map((notification) => (
              <li
                key={notification.id}
                className="flex flex-col gap-2 after:h-0.5 after:bg-brand-beige4"
              >
                <NotificationRow
                  notification={notification}
                  badgeClass="right-2.5"
                />
              </li>
            ))}
          </ul>
        </section>
        <p className="mt-auto pt-2.5 pb-[max(46px,env(safe-area-inset-bottom))] text-center text-[12px] leading-[1.5] font-medium text-brand-brown1">
          받은 알림은 30일동안 보관됩니다.
        </p>
      </main>
    </div>
  )
}
