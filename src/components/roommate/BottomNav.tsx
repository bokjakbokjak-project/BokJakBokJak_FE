import { Link } from 'react-router'
import navChat from '../../assets/roommate/nav-chat.svg'
import navHome from '../../assets/roommate/nav-home.svg'
import navMy from '../../assets/roommate/nav-my.svg'
import navPeople from '../../assets/roommate/nav-people.svg'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'

const LABEL_CLASS =
  'absolute top-[47px] left-1/2 -translate-x-1/2 text-[14px] leading-[1.5] font-medium whitespace-nowrap'

// Positions from the Figma navigation bar (710:864), as a share of its 390px width.
const PENDING_ITEMS = [
  { label: '홈', icon: navHome, center: 57.5, iconClass: 'top-4 size-[29px]' },
  {
    label: '채팅',
    icon: navChat,
    center: 237,
    iconClass: 'top-5 h-[19.94px] w-[19.944px]',
  },
  { label: '마이', icon: navMy, center: 331, iconClass: 'top-[18px] size-7' },
]

const toPercent = (center: number) => `${(center / 390) * 100}%`

/** Home, chat, and my page are not built yet, so those items are disabled (OPEN_QUESTIONS RM-6). */
export default function BottomNav() {
  return (
    <nav
      aria-label="하단 메뉴"
      className="relative z-10 shrink-0 rounded-t-[10px] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_30px_0_rgba(230,217,206,0.25)]"
    >
      <div className="relative h-20">
        {PENDING_ITEMS.map(({ label, icon, center, iconClass }) => (
          <button
            key={label}
            type="button"
            disabled
            className="absolute top-0 h-20 w-14 -translate-x-1/2 text-gray-300"
            style={{ left: toPercent(center) }}
          >
            <img
              src={icon}
              alt=""
              className={`absolute left-1/2 -translate-x-1/2 ${iconClass}`}
            />
            <span className={LABEL_CLASS}>{label}</span>
          </button>
        ))}
        <Link
          to={ROOMMATE_ROUTES.list}
          aria-current="page"
          className="absolute top-0 h-20 w-[72px] -translate-x-1/2 text-brand-brown1"
          style={{ left: toPercent(147) }}
        >
          <img
            src={navPeople}
            alt=""
            className="absolute top-[15px] left-1/2 size-8 -translate-x-1/2"
          />
          <span className={LABEL_CLASS}>룸메이트</span>
        </Link>
      </div>
    </nav>
  )
}
