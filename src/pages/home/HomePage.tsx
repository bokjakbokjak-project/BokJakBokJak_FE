import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import bellBefore from '../../assets/home/bell-before.svg'
import bellMatched from '../../assets/home/bell-matched.svg'
import bubbleBefore from '../../assets/home/bubble-before.svg'
import bubbleMatched from '../../assets/home/bubble-matched.svg'
import roomBackground from '../../assets/home/room-bg.png'
import AppLogo from '../../components/AppLogo/AppLogo'
import BottomNav from '../../components/BottomNav/BottomNav'
import CharacterPreview from '../../components/onboarding/CharacterPreview'
import { isServerMode } from '../../lib/api/config'
import { STAGE } from '../../lib/onboarding/character'
import { getMatchStatus, type MatchStatus } from '../../lib/home/matchStatus'
import {
  getNotifications,
  hasNewNotification,
} from '../../lib/home/notificationData'
import { getUnreadNotificationCount } from '../../lib/home/notificationApi'
import { HOME_ROUTES } from '../../lib/home/routes'
import { MY_ROUTES } from '../../lib/my/routes'
import { useDisplayProfile } from '../../lib/profile/myProfile'

// The two Figma frames also differ in the bell and a 1px shift (OPEN_QUESTIONS DE-H1). The logo is
// the same on both and on the roommate list (AppLogo).
const VARIANTS = {
  // Figma 724:9392
  before: {
    greeting: (name: string) => [
      `안녕하세요 ${name}님 `,
      '어떤 룸메이트가 찾아올까요?',
    ],
    bubble: ['어떤 룸메이트와', '같이 살게 될까?'],
    bubbleImage: bubbleBefore,
    bubbleLeft: 109,
    characterLeft: 51,
    bell: bellBefore,
    bellClass: 'right-[30px]',
  },
  // Figma 724:11202
  matched: {
    greeting: (name: string) => [
      `안녕하세요 ${name}님 룸메이트와`,
      ' 즐거운 기숙사 생활이 되길 바라요!',
    ],
    bubble: ['룸메이트와 ', '만나게 되어 기뻐!'],
    bubbleImage: bubbleMatched,
    bubbleLeft: 108,
    characterLeft: 50,
    bell: bellMatched,
    bellClass: 'right-[33px]',
  },
} as const

const FRAME = { width: 390, height: 844 }
const toWidthPercent = (value: number) => `${(value / FRAME.width) * 100}%`
const toHeightPercent = (value: number) => `${(value / FRAME.height) * 100}%`

/**
 * The bell's red dot. In server mode it asks `GET /api/notifications/unread-count` each time the
 * home opens and shows the dot for a count of 1 or more (채희 spec 7.16). The spec sets no
 * polling, so it does not ask again while the home stays open. A failed read shows no dot.
 */
function useHasNewNotification() {
  const isServer = isServerMode()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isServer) return
    const controller = new AbortController()
    getUnreadNotificationCount(controller.signal).then(
      (value) => {
        if (!controller.signal.aborted) setCount(value)
      },
      () => {},
    )
    return () => controller.abort()
  }, [isServer])

  return isServer ? count > 0 : hasNewNotification(getNotifications())
}

/**
 * The room art scales with the screen width, and the character and the bubble follow it, so they
 * stay on the rug. The bar stays at the bottom, and only the content above it scrolls on short
 * screens. The PC frame is always 844px tall.
 */
export default function HomePage({
  matchStatus = getMatchStatus(),
}: {
  matchStatus?: MatchStatus
}) {
  const variant = VARIANTS[matchStatus]
  // Server mode: the saved nickname and the top three categories, so a new session greets the
  // user by name and draws their character (GET /api/me/profile).
  const { name, priorities } = useDisplayProfile()
  const hasNew = useHasNewNotification()

  return (
    <div className="relative -mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex h-dvh flex-col overflow-hidden bg-home-floor md:h-[844px]">
      <div
        data-testid="home-scroll"
        className="scrollbar-none relative min-h-0 flex-1 overflow-y-auto"
      >
        {/* The bar covers the last 80px of the 844px frame, so the content needs 764px of it. */}
        <main className="relative aspect-[390/764] min-h-full w-full overflow-clip">
          <div className="absolute inset-x-0 top-0 aspect-[390/844]">
            <img
              src={roomBackground}
              alt=""
              className="absolute inset-0 size-full max-w-none"
            />
            <div className="absolute inset-x-0 top-0 h-[max(258px,30.569%)] bg-[linear-gradient(to_bottom,var(--color-brand-cream1)_67.842%,rgba(255,255,255,0)_96.918%)]" />
            <div
              className="absolute"
              style={{
                left: toWidthPercent(variant.characterLeft),
                top: toHeightPercent(332),
                width: toWidthPercent(STAGE.width),
              }}
            >
              <CharacterPreview
                priorities={priorities}
                showRug={false}
                greet
                className="relative w-full"
              />
            </div>
            <div
              className="absolute aspect-[173/78] motion-safe:animate-bubble-float"
              style={{
                left: toWidthPercent(variant.bubbleLeft),
                top: toHeightPercent(254),
                width: toWidthPercent(173),
              }}
            >
              <img
                src={variant.bubbleImage}
                alt=""
                className="absolute inset-0 size-full max-w-none"
              />
              <p className="absolute inset-x-0 top-[14.1%] text-center text-[16px] leading-[1.3] font-semibold tracking-[-0.32px] text-brand-brown1">
                {variant.bubble.map((line) => (
                  <span key={line} className="block whitespace-pre">
                    {line}
                  </span>
                ))}
              </p>
            </div>
          </div>
          <div className="relative pt-[max(47px,env(safe-area-inset-top))]">
            <header className="relative h-14">
              <AppLogo />
              <Link
                to={HOME_ROUTES.notifications}
                aria-label={hasNew ? '알림, 새 알림 있음' : '알림'}
                className={`absolute top-3.5 size-7 before:absolute before:-inset-2 ${variant.bellClass}`}
              >
                <img
                  src={variant.bell}
                  alt=""
                  className="absolute top-[3px] left-[3px] h-[23.33px] w-[21px] max-w-none"
                />
                {hasNew && (
                  <span className="absolute top-px left-4 size-[11px] rounded-full border border-white bg-home-alert" />
                )}
              </Link>
            </header>
            <h1 className="mt-[15px] px-6 text-[clamp(18px,5.641vw,22px)] leading-[1.5] font-bold tracking-[0.44px] break-words text-gray-500 md:text-[22px]">
              {variant.greeting(name).map((line) => (
                <span key={line} className="block whitespace-pre-wrap">
                  {line}
                </span>
              ))}
            </h1>
          </div>
          {/* Opens the my page, where the survey result is viewed and retaken. The home edits
              no answers (decided by the project owner on 2026-11-14). */}
          <Link
            to={MY_ROUTES.my}
            className="absolute inset-x-6 bottom-9 flex h-[65px] items-center justify-center rounded-[10px] bg-brand-brown1 text-[20px] leading-[1.5] font-semibold whitespace-nowrap text-white"
          >
            내 설문 다시보기 →
          </Link>
        </main>
      </div>
      <BottomNav active="home" />
    </div>
  )
}
