import { Link } from 'react-router'
import arrowLeft from '../../assets/icons/arrow-left.svg'

type RoommateHeaderProps = {
  backTo: string
  title: string
  /** Router state to keep on the way back, such as the chat room a visit started from. */
  backState?: unknown
}

/** Back button and centered title from Figma (1057:13038 `룸메이트`, 1377:36705 `상세 프로필`). */
export default function RoommateHeader({
  backTo,
  title,
  backState,
}: RoommateHeaderProps) {
  return (
    <header className="relative z-20 h-14 shrink-0">
      <Link
        to={backTo}
        state={backState}
        aria-label="이전"
        className="absolute top-3.5 left-6 size-7 overflow-hidden rounded-full border-[1.5px] border-transparent transition-colors hover:border-brand-brown3 hover:bg-brand-beige1 focus-visible:border-brand-brown3 focus-visible:bg-brand-beige1"
      >
        <span className="absolute inset-[calc(25%-0.38px)]">
          <span className="absolute inset-[-7.14%_-7.16%_-7.14%_-7.12%]">
            <img src={arrowLeft} alt="" className="block size-full" />
          </span>
        </span>
      </Link>
      <h1 className="absolute top-[13px] left-1/2 -translate-x-1/2 text-[20px] leading-[1.5] font-bold whitespace-nowrap text-brand-brown1">
        {title}
      </h1>
    </header>
  )
}
