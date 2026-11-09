import { useLayoutEffect, useRef } from 'react'
import roomBackground from '../../assets/home/room-bg.png'
import chevronDown from '../../assets/roommate/chevron-down.svg'
import refreshIcon from '../../assets/roommate/refresh.svg'
import AppLogo from '../../components/AppLogo/AppLogo'
import BottomNav from '../../components/BottomNav/BottomNav'
import RoommateCard from '../../components/roommate/RoommateCard'
import { getCandidates } from '../../lib/roommate/roommateData'
import { useRoommate } from '../../lib/roommate/roommateState'

/**
 * Figma 912:14164 and 1095:26603, note: "홈화면 고정으로 하고 룸메이트 리스트만 움직이게 해주세요".
 * The background, header, and title stay; only the card list scrolls above the fixed bottom bar.
 * The page takes the screen height, and the PC frame is always 844px tall.
 */
export default function RoommateListPage() {
  const { visibleCount, showMore, reset, listScrollTopRef } = useRoommate()
  const listRef = useRef<HTMLDivElement>(null)
  const candidates = getCandidates()
  const hasMore = visibleCount < candidates.length

  useLayoutEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listScrollTopRef.current
  }, [listScrollTopRef])

  // There is no recommendation API yet, so this only returns the list to its first state.
  const handleRefresh = () => {
    reset()
    if (listRef.current) listRef.current.scrollTop = 0
  }

  return (
    <div className="relative -mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex h-dvh flex-col overflow-hidden bg-home-floor pt-[max(47px,env(safe-area-inset-top))] md:h-[844px]">
      {/* The same room as the home (Figma 1057:13060), scaled with the width. The page color
          continues the floor on taller screens. */}
      <img
        src={roomBackground}
        alt=""
        className="absolute inset-x-0 top-0 h-auto w-full max-w-none"
      />
      <div className="absolute inset-x-0 top-0 h-[228px] bg-[linear-gradient(to_bottom,var(--color-brand-cream1)_67.842%,rgba(255,255,255,0)_96.918%)]" />
      <header className="relative h-14 shrink-0">
        <AppLogo />
        <button
          type="button"
          className="absolute top-[10px] right-[23px] flex h-[35px] items-center gap-0.5 rounded-full border-2 border-brand-brown3 bg-brand-beige1 py-[5px] pr-1.5 pl-[7px] text-[14px] leading-[normal] font-semibold whitespace-nowrap text-brand-brown3"
          onClick={handleRefresh}
        >
          새로고침
          <img src={refreshIcon} alt="" className="size-3.5" />
        </button>
      </header>
      <div className="relative mt-[9px] flex shrink-0 flex-col items-center text-center leading-[1.5]">
        <h1 className="text-[22px] font-bold text-brand-brown1">
          룸메이트 매칭 결과
        </h1>
        <p className="text-[12px] font-medium tracking-[0.24px] text-roommate-caption">
          사용자의 설문조사와 유사한 순으로 추천해요
        </p>
      </div>
      <div
        ref={listRef}
        data-testid="roommate-list"
        className="scrollbar-none relative mt-[25px] min-h-0 flex-1 overflow-y-auto"
        onScroll={(event) => {
          listScrollTopRef.current = event.currentTarget.scrollTop
        }}
      >
        <ul className="mx-auto flex w-full max-w-[390px] flex-col gap-2.5 px-6 pb-[15px]">
          {candidates.slice(0, visibleCount).map((candidate) => (
            <li key={candidate.id}>
              <RoommateCard candidate={candidate} />
            </li>
          ))}
        </ul>
        {hasMore && (
          <button
            type="button"
            className="mx-auto mb-[25px] flex items-center gap-0.5 px-[35px] py-2.5 text-[18px] leading-[normal] font-semibold whitespace-pre text-brand-brown3"
            onClick={showMore}
          >
            {'리스트 더보기 '}
            <img src={chevronDown} alt="" className="size-6" />
          </button>
        )}
      </div>
      <BottomNav active="roommate" />
    </div>
  )
}
