import { useLayoutEffect, useRef } from 'react'
import logo from '../../assets/onboarding/logo.svg'
import listBackground from '../../assets/roommate/list-bg.png'
import refreshIcon from '../../assets/roommate/refresh.svg'
import BottomNav from '../../components/BottomNav/BottomNav'
import RoommateCard from '../../components/roommate/RoommateCard'
import { getCandidates } from '../../lib/roommate/roommateData'
import { useRoommate } from '../../lib/roommate/roommateState'

/**
 * Figma note: "홈화면 고정으로 하고 룸메이트 리스트만 움직이게 해주세요". The page takes the screen
 * height, and only the card list scrolls. The PC frame is always 844px tall.
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
    <div className="relative -mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex h-dvh flex-col overflow-hidden bg-[#f7c79e] pt-[max(47px,env(safe-area-inset-top))] md:h-[844px]">
      {/* Scales with the width only, as in Figma. The page color continues the floor on taller screens. */}
      <img
        src={listBackground}
        alt=""
        className="absolute inset-x-0 top-0 h-auto w-full max-w-none"
      />
      <header className="relative h-14 shrink-0">
        <h1>
          <img
            src={logo}
            alt="복작복작"
            className="absolute top-[13px] left-6 h-[29.75px] w-[45px] max-w-none"
          />
        </h1>
        <button
          type="button"
          className="absolute top-[21px] right-6 flex items-center text-[12px] leading-[normal] whitespace-pre text-black"
          onClick={handleRefresh}
        >
          {'새로고침 '}
          <img src={refreshIcon} alt="" className="size-3.5" />
        </button>
      </header>
      <p className="relative mt-6 shrink-0 text-center text-[12px] leading-[normal] font-medium tracking-[0.24px] text-black">
        룸메이트리스트는 사용자의 설문조사와
        <br />
        유사한 순으로 우선추천을 진행합니다
      </p>
      <div
        ref={listRef}
        data-testid="roommate-list"
        className="scrollbar-none relative mt-[22px] min-h-0 flex-1 overflow-y-auto"
        onScroll={(event) => {
          listScrollTopRef.current = event.currentTarget.scrollTop
        }}
      >
        <ul className="mx-auto flex w-full max-w-[390px] flex-col gap-1 px-6 pb-3">
          {candidates.slice(0, visibleCount).map((candidate) => (
            <li key={candidate.id}>
              <RoommateCard candidate={candidate} />
            </li>
          ))}
        </ul>
        {hasMore && (
          <button
            type="button"
            className="mx-auto block pb-[22px] text-[14px] leading-[1.5] font-semibold text-brand-brown1"
            onClick={showMore}
          >
            +더보기
          </button>
        )}
      </div>
      <BottomNav active="roommate" />
    </div>
  )
}
