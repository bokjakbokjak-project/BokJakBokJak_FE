import { Link } from 'react-router'
import navChat from '../../assets/nav/nav-chat.svg'
import navHomeActive from '../../assets/nav/nav-home-active.svg'
import navHome from '../../assets/nav/nav-home.svg'
import navMyActive from '../../assets/nav/nav-my-active.svg'
import navMy from '../../assets/nav/nav-my.svg'
import navPeopleInactive from '../../assets/nav/nav-people-inactive.svg'
import navPeople from '../../assets/nav/nav-people.svg'
import { HOME_ROUTES } from '../../lib/home/routes'
import { MY_ROUTES } from '../../lib/my/routes'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'
import { usePendingNotice, type PendingNotice } from './usePendingNotice'

export type BottomNavItem = 'home' | 'roommate' | 'my'

const LABEL_CLASS =
  'absolute top-[47px] -translate-x-1/2 text-[14px] leading-[1.5] font-medium whitespace-nowrap'
const ICON_CLASS = 'absolute left-1/2 -translate-x-1/2'

// Positions from the Figma navigation bar (657:781), as a share of its 390px width.
const LINK_ITEMS = [
  {
    id: 'home',
    label: '홈',
    to: HOME_ROUTES.home,
    center: 57.5,
    width: 'w-14',
    iconClass: 'top-4 size-[29px]',
    // The icon and the label of this item are 0.5px apart in Figma.
    labelClass: 'left-[calc(50%-0.5px)]',
    activeIcon: navHomeActive,
    inactiveIcon: navHome,
  },
  {
    id: 'roommate',
    label: '룸메이트',
    to: ROOMMATE_ROUTES.list,
    center: 147,
    width: 'w-[72px]',
    iconClass: 'top-[15px] size-8',
    labelClass: 'left-1/2',
    activeIcon: navPeople,
    inactiveIcon: navPeopleInactive,
  },
  {
    id: 'my',
    label: '마이',
    to: MY_ROUTES.my,
    center: 331,
    width: 'w-14',
    iconClass: 'top-[18px] size-7',
    labelClass: 'left-1/2',
    activeIcon: navMyActive,
    inactiveIcon: navMy,
  },
] as const

const toPercent = (center: number) => `${(center / 390) * 100}%`

type BottomNavProps = {
  active: BottomNavItem
  /** Lets the page show the same notice from its own buttons. */
  notice?: PendingNotice
}

/** Chat is not built yet, so that item only shows a notice (OPEN_QUESTIONS HM-3). */
export default function BottomNav({ active, notice }: BottomNavProps) {
  const ownNotice = usePendingNotice()
  const { isShown, show } = notice ?? ownNotice

  return (
    <nav
      aria-label="하단 메뉴"
      className="relative z-10 shrink-0 rounded-t-[10px] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_30px_0_rgba(230,217,206,0.25)]"
    >
      {/* Stays mounted so screen readers announce the text when it appears. It takes no layout
          space, because it sits above the bar. */}
      <div
        role="status"
        className="pointer-events-none absolute inset-x-0 bottom-full mb-[3px] flex justify-center"
      >
        {isShown && (
          <span className="flex h-[30px] items-center rounded-[10px] bg-gray-600 px-3.5 text-[13px] font-medium text-white">
            아직 준비 중입니다.
          </span>
        )}
      </div>
      <div className="relative h-20">
        {LINK_ITEMS.map((item) => {
          const isActive = item.id === active
          return (
            <Link
              key={item.id}
              to={item.to}
              aria-current={isActive ? 'page' : undefined}
              className={`absolute top-0 h-20 -translate-x-1/2 ${item.width} ${isActive ? 'text-brand-brown1' : 'text-gray-300'}`}
              style={{ left: toPercent(item.center) }}
            >
              <img
                src={isActive ? item.activeIcon : item.inactiveIcon}
                alt=""
                className={`${ICON_CLASS} ${item.iconClass}`}
              />
              <span className={`${LABEL_CLASS} ${item.labelClass}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
        <button
          type="button"
          className="absolute top-0 h-20 w-14 -translate-x-1/2 text-gray-300"
          style={{ left: toPercent(237) }}
          onClick={show}
        >
          <img
            src={navChat}
            alt=""
            className={`${ICON_CLASS} top-5 h-[19.94px] w-[19.944px]`}
          />
          <span className={`${LABEL_CLASS} left-1/2`}>채팅</span>
        </button>
      </div>
    </nav>
  )
}
