import { Link } from 'react-router'
import arrowLeft from '../../assets/icons/arrow-left.svg'

/** Back button and title from Figma (1057:13038). */
export default function RoommateHeader({ backTo }: { backTo: string }) {
  return (
    <header className="relative z-20 h-14 shrink-0">
      <Link
        to={backTo}
        aria-label="이전"
        className="absolute top-3.5 left-6 size-7 overflow-hidden rounded-full border-[1.5px] border-brand-brown3 bg-brand-beige1"
      >
        <span className="absolute inset-[calc(25%-0.38px)]">
          <span className="absolute inset-[-7.14%_-7.16%_-7.14%_-7.12%]">
            <img src={arrowLeft} alt="" className="block size-full" />
          </span>
        </span>
      </Link>
      <h1 className="absolute top-[13px] left-[calc(50%-34px)] text-[20px] leading-[1.5] font-bold whitespace-nowrap text-brand-brown1">
        룸메이트
      </h1>
    </header>
  )
}
